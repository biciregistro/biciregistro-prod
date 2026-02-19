'use server';

import { adminDb as db } from '../firebase/server';
import { Campaign, CampaignConversion, ActionFormState, User } from '../types';
import { getDecodedSession } from '../auth/server';
import { revalidatePath } from 'next/cache';
import { FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { headers } from 'next/headers';

// --- User Facing Actions ---

/**
 * Fetches active campaigns for a given placement.
 * @param placement - The location where the campaign will be displayed.
 * @returns A list of active campaigns.
 */
export async function getActiveCampaigns(placement: 'dashboard_main' | 'dashboard_sidebar' | 'event_list' = 'dashboard_main'): Promise<(Campaign & { advertiserName?: string })[]> {
  try {
    const now = new Date();
    
    // Query: Status=active AND Placement=X (Date filter in memory for robustness)
    const campaignsSnapshot = await db.collection('campaigns')
      .where('status', '==', 'active')
      .where('placement', '==', placement)
      .get();

    const campaigns: Campaign[] = [];

    campaignsSnapshot.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data() as Campaign;
      
      // Robust Date Parsing
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      
      // Filter by date range
      if (start <= now && end >= now) {
        campaigns.push({ ...data, id: doc.id });
      }
    });

    // Enrich with Advertiser Name
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
        
        return {
            ...c,
            advertiserName
        };
    }));

    return enrichedCampaigns;
  } catch (error) {
    console.error('Error fetching active campaigns:', error);
    return [];
  }
}

/**
 * Records a user conversion (click/download) for a campaign.
 * @param campaignId - The ID of the campaign.
 * @returns The conversion record or null if failed.
 */
export async function recordCampaignConversion(
    campaignId: string, 
    consentData?: { accepted: boolean, text: string }
): Promise<ActionFormState> {
  try {
    const session = await getDecodedSession();
    if (!session) {
      return { error: 'Debes iniciar sesión para acceder a este beneficio.' };
    }

    // GDPR / Legal Validation
    if (!consentData?.accepted) {
        return { error: 'Es necesario aceptar el consentimiento de datos para continuar.' };
    }

    const userId = session.uid;
    
    // Capture Technical Evidence
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = headerList.get('user-agent') || 'unknown';
    // Current privacy policy version - Should be updated if legal terms change
    const privacyPolicyVersion = 'v.2026-01-31'; 

    
    // 1. Get User Data for Snapshot
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        return { error: 'Usuario no encontrado.' };
    }
    const userData = userDoc.data() as User;

    // 2. Check if already converted (Optional: Prevent duplicate leads if business rule requires)
    const existingConversion = await db.collection('campaign_conversions')
        .where('campaignId', '==', campaignId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

    if (!existingConversion.empty) {
        return { success: true, message: 'Ya has descargado este contenido previamente.' };
    }

    // 3. Create Conversion Record
    const conversionData: Omit<CampaignConversion, 'id'> = {
        campaignId,
        userId,
        userEmail: userData.email,
        userName: `${userData.name} ${userData.lastName || ''}`.trim(),
        userCity: userData.city || 'Desconocido',
        convertedAt: new Date().toISOString(),
        ipAddress: ip,
        privacyPolicyVersion: privacyPolicyVersion,
        metadata: {
            deviceType: 'unknown', // Could infer from UA if needed, keeping simple
            userAgent: userAgent
        },
        consent: {
            accepted: consentData.accepted,
            text: consentData.text,
            timestamp: new Date().toISOString()
        }
    };

    await db.collection('campaign_conversions').add(conversionData);

    // 4. Update Campaign Counters (Atomic Increment)
    await db.collection('campaigns').doc(campaignId).update({
        clickCount: FieldValue.increment(1),
        uniqueConversionCount: FieldValue.increment(1)
    });

    return { success: true, message: 'Conversión registrada correctamente.' };

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

        const newCampaign: Omit<Campaign, 'id'> = {
            ...data,
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

        await db.collection('campaigns').doc(campaignId).update({
            status: newStatus,
            updatedAt: new Date().toISOString()
        });

        revalidatePath('/admin');
        revalidatePath('/dashboard'); // Update user dashboard banner
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

        return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as CampaignConversion));
    } catch (error) {
        console.error('Error fetching leads:', error);
        return [];
    }
}
