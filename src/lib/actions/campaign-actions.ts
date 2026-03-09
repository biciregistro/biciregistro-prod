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
 */
export async function getActiveCampaigns(placement: 'dashboard_main' | 'dashboard_sidebar' | 'event_list' = 'dashboard_main'): Promise<(Campaign & { advertiserName?: string })[]> {
  try {
    const now = new Date();
    
    let query = db.collection('campaigns')
      .where('status', '==', 'active')
      .where('placement', '==', placement);

    if (placement === 'dashboard_main' || placement === 'dashboard_sidebar') {
        query = query.where('type', 'in', ['download', 'link']);
    }

    const campaignsSnapshot = await query.get();
    const campaigns: Campaign[] = [];

    campaignsSnapshot.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data() as Campaign;
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (start <= now && end >= now) {
        campaigns.push({ ...data, id: doc.id });
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
        return { success: true, message: 'Ya has descargado este contenido previamente.' };
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

// ... (Resto de acciones administrativas permanecen igual) ...
