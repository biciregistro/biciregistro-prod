'use server';

import { adminDb as db } from '../firebase/server';
import { Campaign, CampaignConversion, ActionFormState, User } from '../types';
import { getDecodedSession } from '../auth/server';
import { revalidatePath } from 'next/cache';
import { FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { headers } from 'next/headers';
import { getCampaignAnalytics } from '@/lib/data/campaign-analytics';
import { EventAnalyticsData } from '@/lib/data/event-analytics';
import { awardPoints } from '@/lib/actions/gamification-actions'; // Importar gamificación

// --- User Facing Actions ---

/**
 * Fetches active campaigns for a given placement.
 * If userState and userCountry are provided, it filters out campaigns segmented
 * for other states. If not provided, it returns only global campaigns.
 */
export async function getActiveCampaigns(
    placement: 'dashboard_main' | 'dashboard_sidebar' | 'event_list' | 'welcome_banner' = 'dashboard_main',
    userCountry?: string,
    userState?: string
): Promise<(Campaign & { advertiserName?: string })[]> {
  try {
    const now = new Date();
    
    let query = db.collection('campaigns')
      .where('status', '==', 'active')
      .where('placement', '==', placement);

    if (placement === 'dashboard_main' || placement === 'dashboard_sidebar' || placement === 'welcome_banner') {
        query = query.where('type', 'in', ['download', 'link']);
    }

    const campaignsSnapshot = await query.get();
    const campaigns: Campaign[] = [];

    campaignsSnapshot.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data() as Campaign;
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (start <= now && end >= now) {
          // Backward compatibility: If targetScope is undefined, assume it's global
          const scope = data.targetScope || 'global';
          
          if (scope === 'global') {
              campaigns.push({ ...data, id: doc.id });
          } else if (scope === 'state' && userCountry && userState) {
              if (data.targetCountry === userCountry && data.targetState === userState) {
                  campaigns.push({ ...data, id: doc.id });
              }
          }
      }
    });

    const enrichedCampaigns = await Promise.all(campaigns.map(async (c) => {
        let advertiserName = 'Aliado';
        try {
            const userDoc = await db.collection('users').doc(c.advertiserId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                advertiserName = userData?.organizationName || userData?.name || 'Aliado';
            }
        } catch (e) {
            console.error('Error fetching advertiser name', e);
        }
        return { ...c, advertiserName };
    }));

    return enrichedCampaigns;
  } catch (error) {
    console.error('Error fetching active campaigns:', error);
    return [];
  }
}

/**
 * Records a user conversion (click/download) for a campaign.
 */
export async function recordCampaignConversion(
    campaignId: string, 
    consentData?: { accepted: boolean, text: string }
): Promise<ActionFormState & { pointsAwarded?: number }> {
  try {
    const session = await getDecodedSession();
    if (!session) return { error: 'Debes iniciar sesión para acceder a este beneficio.' };
    if (!consentData?.accepted) return { error: 'Es necesario aceptar el consentimiento de datos para continuar.' };

    const userId = session.uid;
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = headerList.get('user-agent') || 'unknown';
    const privacyPolicyVersion = 'v.2026-01-31'; 

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return { error: 'Usuario no encontrado.' };
    const userData = userDoc.data() as User;

    const existingConversion = await db.collection('campaign_conversions')
        .where('campaignId', '==', campaignId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

    if (!existingConversion.empty) {
        return { success: true, message: 'Ya has interactuado con esta campaña previamente.' };
    }

    const conversionData: Omit<CampaignConversion, 'id'> = {
        campaignId,
        userId,
        userEmail: userData.email,
        userName: `${userData.name} ${userData.lastName || ''}`.trim(),
        userCity: userData.city || 'Desconocido',
        userState: userData.state,
        userCountry: userData.country,
        convertedAt: new Date().toISOString(),
        ipAddress: ip,
        privacyPolicyVersion: privacyPolicyVersion,
        metadata: { deviceType: 'unknown', userAgent: userAgent },
        consent: { accepted: consentData.accepted, text: consentData.text, timestamp: new Date().toISOString() }
    };

    await db.collection('campaign_conversions').add(conversionData);
    await db.collection('campaigns').doc(campaignId).update({
        clickCount: FieldValue.increment(1),
        uniqueConversionCount: FieldValue.increment(1)
    });

    // GAMIFICACIÓN DINÁMICA: Puntos por participar
    const pointsResult = await awardPoints(userId, 'campaign_participation', { campaignId });

    return { 
        success: true, 
        message: 'Conversión registrada correctamente.',
        pointsAwarded: pointsResult?.points || 0
    };

  } catch (error) {
    console.error('Error recording conversion:', error);
    return { error: 'Ocurrió un error al procesar tu solicitud.' };
  }
}

// --- Admin Actions ---

/**
 * Creates a new advertising campaign.
 * @param data - The campaign data.
 * @returns The created campaign ID or error.
 */
export async function createCampaign(data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'clickCount' | 'uniqueConversionCount'>): Promise<ActionFormState> {
    try {
        const session = await getDecodedSession();
        
        if (!session) return { error: 'No autorizado' };
        
        // Check for admin role
        const userDoc = await db.collection('users').doc(session.uid).get();
        const userData = userDoc.data();
        
        if (userData?.role !== 'admin') {
            return { error: 'No tienes permisos de administrador.' };
        }

        // FORCE PLACEMENT FOR REWARDS/GIVEAWAYS TO PREVENT RENDER BUGS
        let finalPlacement = data.placement;
        if (data.type === 'reward' || data.type === 'giveaway') {
            finalPlacement = 'event_list';
        }

        const scope = data.targetScope || 'global';

        // Check for placement overlap logic IF the campaign is going to be active
        if (data.status === 'active') {
            const overlapError = await checkCampaignOverlap(finalPlacement, scope, data.targetCountry, data.targetState);
            if (overlapError) return { error: overlapError };
        }

        const newCampaign: Omit<Campaign, 'id'> = {
            ...data,
            placement: finalPlacement,
            clickCount: 0,
            uniqueConversionCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await db.collection('campaigns').add(newCampaign);
        revalidatePath('/admin/campaigns');
        revalidatePath('/admin');
        return { success: true, message: 'Campaña creada exitosamente.' };

    } catch (error) {
        console.error('Error creating campaign:', error);
        return { error: 'Error al crear la campaña.' };
    }
}

/**
 * Helper to check for overlapping active campaigns in the same placement.
 * Returns an error string if there's an overlap, null otherwise.
 */
async function checkCampaignOverlap(
    placement: string, 
    scope: 'global' | 'state', 
    country?: string, 
    state?: string, 
    excludeCampaignId?: string
): Promise<string | null> {
    const activeCampaignsSnap = await db.collection('campaigns')
        .where('status', '==', 'active')
        .where('placement', '==', placement)
        .get();

    let hasGlobal = false;
    const activeStates = new Set<string>();

    activeCampaignsSnap.forEach(doc => {
        if (excludeCampaignId && doc.id === excludeCampaignId) return;
        
        const data = doc.data() as Campaign;
        const s = data.targetScope || 'global';
        if (s === 'global') hasGlobal = true;
        if (s === 'state' && data.targetCountry && data.targetState) {
            activeStates.add(`${data.targetCountry}-${data.targetState}`);
        }
    });

    if (scope === 'global') {
        if (hasGlobal) return 'Ya existe una campaña global activa en esta ubicación. Pausala o espera a que termine.';
        if (activeStates.size > 0) return 'No puedes crear una campaña global en esta ubicación porque hay campañas por estado activas.';
    } else {
        if (hasGlobal) return 'No puedes crear una campaña por estado porque ya existe una campaña global activa en esta ubicación.';
        if (activeStates.has(`${country}-${state}`)) {
            return `Ya existe una campaña activa para el estado ${state} en esta ubicación.`;
        }
    }

    return null;
}

/**
 * Updates an existing campaign.
 */
export async function updateCampaign(campaignId: string, data: Partial<Campaign>): Promise<ActionFormState> {
    try {
        const session = await getDecodedSession();
        if (!session) return { error: 'No autorizado' };
        
        const userDoc = await db.collection('users').doc(session.uid).get();
        if (userDoc.data()?.role !== 'admin') {
             return { error: 'No autorizado' };
        }

        // Check current data
        const currentSnap = await db.collection('campaigns').doc(campaignId).get();
        if (!currentSnap.exists) return { error: 'Campaña no encontrada' };
        const currentData = currentSnap.data() as Campaign;

        // FORCE PLACEMENT FOR REWARDS/GIVEAWAYS TO PREVENT RENDER BUGS
        let finalPlacement = data.placement || currentData.placement;
        if (data.type === 'reward' || data.type === 'giveaway' || currentData.type === 'reward' || currentData.type === 'giveaway') {
            finalPlacement = 'event_list';
        }

        const newStatus = data.status || currentData.status;
        const newScope = data.targetScope || currentData.targetScope || 'global';
        const newCountry = data.targetCountry !== undefined ? data.targetCountry : currentData.targetCountry;
        const newState = data.targetState !== undefined ? data.targetState : currentData.targetState;

        // If it's being set to active, or updated while active, check overlaps
        if (newStatus === 'active') {
             const overlapError = await checkCampaignOverlap(finalPlacement, newScope, newCountry, newState, campaignId);
             if (overlapError) return { error: overlapError };
        }

        // Remove protected fields from update payload
        const updatePayload = { ...data, updatedAt: new Date().toISOString() };
        delete (updatePayload as any).id;
        delete (updatePayload as any).createdAt;
        delete (updatePayload as any).clickCount;
        delete (updatePayload as any).uniqueConversionCount;
        updatePayload.placement = finalPlacement;

        await db.collection('campaigns').doc(campaignId).update(updatePayload);

        revalidatePath('/admin/campaigns');
        revalidatePath('/admin');
        revalidatePath('/dashboard/rewards'); // Ensure rewards tab is refreshed if it's a reward
        return { success: true, message: 'Campaña actualizada exitosamente.' };
    } catch (error) {
        console.error('Error updating campaign:', error);
        return { error: 'Error al actualizar la campaña.' };
    }
}

/**
 * Deletes a campaign (soft delete or hard delete based on preference. Here doing Hard Delete).
 */
export async function deleteCampaign(campaignId: string): Promise<ActionFormState> {
    try {
        const session = await getDecodedSession();
        if (!session) return { error: 'No autorizado' };
        
        const userDoc = await db.collection('users').doc(session.uid).get();
        if (userDoc.data()?.role !== 'admin') {
             return { error: 'No autorizado' };
        }

        await db.collection('campaigns').doc(campaignId).delete();

        revalidatePath('/admin/campaigns');
        revalidatePath('/admin');
        revalidatePath('/dashboard/rewards'); 
        return { success: true, message: 'Campaña eliminada correctamente.' };
    } catch (error) {
        console.error('Error deleting campaign:', error);
        return { error: 'Error al eliminar la campaña.' };
    }
}


/**
 * Fetches all users with role 'ong' to populate the advertiser select.
 */
export async function getAdvertisersList(): Promise<{id: string, name: string}[]> {
    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'ong')
            .get();

        return snapshot.docs.map((doc: QueryDocumentSnapshot) => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.organizationName || data.name || 'Sin Nombre'
            };
        });
    } catch (error) {
        console.error('Error fetching advertisers:', error);
        return [];
    }
}

/**
 * Fetches all campaigns for the admin dashboard.
 */
export async function getAllCampaignsForAdmin(): Promise<Campaign[]> {
    try {
        const snapshot = await db.collection('campaigns')
            .orderBy('createdAt', 'desc')
            .get();

        return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as Campaign));
    } catch (error) {
        console.error('Error fetching all campaigns:', error);
        return [];
    }
}

/**
 * Updates the status of a campaign.
 */
export async function updateCampaignStatus(campaignId: string, newStatus: 'draft' | 'active' | 'paused' | 'ended'): Promise<ActionFormState> {
    try {
        const session = await getDecodedSession();
        if (!session) return { error: 'No autorizado' };
        
        // Check admin role
        const userDoc = await db.collection('users').doc(session.uid).get();
        if (userDoc.data()?.role !== 'admin') {
             return { error: 'No autorizado' };
        }

        if (newStatus === 'active') {
             const currentSnap = await db.collection('campaigns').doc(campaignId).get();
             if (currentSnap.exists) {
                 const currentData = currentSnap.data() as Campaign;
                 const overlapError = await checkCampaignOverlap(
                     currentData.placement, 
                     currentData.targetScope || 'global', 
                     currentData.targetCountry, 
                     currentData.targetState, 
                     campaignId
                 );
                 if (overlapError) return { error: overlapError };
             }
        }

        await db.collection('campaigns').doc(campaignId).update({
            status: newStatus,
            updatedAt: new Date().toISOString()
        });

        revalidatePath('/admin');
        revalidatePath('/dashboard'); // Update user dashboard banner
        revalidatePath('/dashboard/rewards'); // Ensure changes reflect on rewards tab
        return { success: true, message: `Estado actualizado a: ${newStatus === 'active' ? 'Activa' : newStatus}.` };
    } catch (error) {
        console.error('Error updating status:', error);
        return { error: 'Error al actualizar estado.' };
    }
}


// --- Advertiser (ONG) Actions ---

/**
 * Fetches campaigns associated with a specific advertiser (ONG).
 * @param advertiserId - The ID of the ONG/Advertiser.
 * @returns List of campaigns.
 */
export async function getAdvertiserCampaigns(advertiserId: string): Promise<Campaign[]> {
    try {
        const snapshot = await db.collection('campaigns')
            .where('advertiserId', '==', advertiserId)
            .orderBy('createdAt', 'desc')
            .get();

        return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as Campaign));
    } catch (error) {
        console.error('Error fetching advertiser campaigns:', error);
        return [];
    }
}

/**
 * Fetches conversions (leads) for a specific campaign.
 * Used for CSV export and analytics.
 */
export async function getCampaignLeads(campaignId: string, advertiserId: string): Promise<CampaignConversion[]> {
     try {
        const session = await getDecodedSession();
        if (!session) throw new Error('No autorizado');

        // Security Check: Verify the campaign belongs to the requester OR requester is admin
        const campaignDoc = await db.collection('campaigns').doc(campaignId).get();
        if (!campaignDoc.exists) throw new Error('Campaña no encontrada');
        
        const campaignData = campaignDoc.data() as Campaign;
        
        // Strict Authorization Logic
        if (session.uid !== advertiserId) {
             // If not the owner, check if it's an admin
             const userDoc = await db.collection('users').doc(session.uid).get();
             const userData = userDoc.data();
             if (userData?.role !== 'admin') {
                 throw new Error('No autorizado para ver estos datos.');
             }
        }
        
        // Double check: if passed advertiserId doesn't match campaign owner
        if (campaignData.advertiserId !== advertiserId) {
             throw new Error('Discrepancia de datos de campaña.');
        }

        const snapshot = await db.collection('campaign_conversions')
            .where('campaignId', '==', campaignId)
            .orderBy('convertedAt', 'desc')
            .get();

        // Enriquecer los leads antiguos que no tienen país o estado
        const leads = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data() as CampaignConversion;
            
            // Si falta estado o país, tratamos de recuperarlo del usuario original para mostrarlo
            if (!data.userState || !data.userCountry) {
                try {
                    const uDoc = await db.collection('users').doc(data.userId).get();
                    if (uDoc.exists) {
                        const uData = uDoc.data();
                        // Mantenemos el 'id' de doc.id pero sobrescribimos el state y country
                        return { 
                            ...data, 
                            id: doc.id,
                            userState: uData?.state || '', 
                            userCountry: uData?.country || '' 
                        };
                    }
                } catch(e) {
                    console.error('Could not enrich missing location data', e);
                }
            }
            // Retornamos el objeto base con el ID
            return { ...data, id: doc.id };
        }));

        return leads;
    } catch (error) {
        console.error('Error fetching leads:', error);
        return [];
    }
}

/**
 * Fetches analytics data for a campaign.
 * Validates user permissions.
 */
export async function getCampaignAnalyticsAction(campaignId: string): Promise<EventAnalyticsData | null> {
    try {
        const session = await getDecodedSession();
        if (!session) return null;

        // Security check: Ensure user is admin or campaign owner
        const campaignDoc = await db.collection('campaigns').doc(campaignId).get();
        if (!campaignDoc.exists) return null;
        
        const campaign = campaignDoc.data() as Campaign;
        
        if (session.uid !== campaign.advertiserId) {
             const userDoc = await db.collection('users').doc(session.uid).get();
             if (userDoc.data()?.role !== 'admin') {
                 console.error('Unauthorized access to campaign analytics');
                 return null;
             }
        }

        return await getCampaignAnalytics(campaignId);
    } catch (error) {
        console.error('Error in getCampaignAnalyticsAction:', error);
        return null;
    }
}