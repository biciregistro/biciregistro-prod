'use server';

import { adminDb as db } from '../firebase/server';
import { Campaign, CampaignConversion, ActionFormState, User } from '../types';
import { getDecodedSession } from '../auth/server';
import { revalidatePath } from 'next/cache';
import { FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';

// --- User Facing Actions ---

/**
 * Fetches active campaigns for a given placement.
 * @param placement - The location where the campaign will be displayed.
 * @returns A list of active campaigns.
 */
export async function getActiveCampaigns(placement: 'dashboard_main' | 'dashboard_sidebar' | 'event_list' = 'dashboard_main'): Promise<Campaign[]> {
  try {
    const now = new Date().toISOString();
    
    // Query: Status=active AND Placement=X AND StartDate <= Now
    const campaignsSnapshot = await db.collection('campaigns')
      .where('status', '==', 'active')
      .where('placement', '==', placement)
      .where('startDate', '<=', now)
      .get();

    const campaigns: Campaign[] = [];

    campaignsSnapshot.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data() as Campaign;
      // Filter by endDate in memory
      if (data.endDate >= now) {
        campaigns.push({ ...data, id: doc.id });
      }
    });

    return campaigns;
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
export async function recordCampaignConversion(campaignId: string): Promise<ActionFormState> {
  try {
    const session = await getDecodedSession();
    if (!session) {
      return { error: 'Debes iniciar sesión para acceder a este beneficio.' };
    }

    const userId = session.uid;
    
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
        metadata: {
            deviceType: 'unknown' 
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
        // Note: Admin might call this with the actual advertiserId, so we check if the passed ID matches the campaign
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
