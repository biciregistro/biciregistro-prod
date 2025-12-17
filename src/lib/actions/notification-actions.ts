'use server';

import { adminDb } from '@/lib/firebase/server';
import { notificationCampaignSchema } from '@/lib/schemas';
import { z } from 'zod';
import { sendMulticastNotification } from '@/lib/firebase/server-messaging';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

type FilterParams = z.infer<typeof notificationCampaignSchema>['filters'];

// Helper logic shared between estimation and sending
async function getTargetTokens(filters: FilterParams): Promise<string[]> {
    const db = adminDb;
        
    // 1. Fetch Bikes if bike filters are present
    let bikeUserIds: Set<string> | null = null;
    const hasBikeFilters = filters.bikeMake || filters.bikeModality || filters.targetGroup === 'with_bike';
    const excludeBikes = filters.targetGroup === 'without_bike';

    if (hasBikeFilters || excludeBikes) {
        let bikesQuery = db.collection('bikes').select('userId');
        
        if (filters.bikeMake && filters.bikeMake !== "none") {
            bikesQuery = bikesQuery.where('make', '==', filters.bikeMake);
        }
        if (filters.bikeModality && filters.bikeModality !== "none") {
            bikesQuery = bikesQuery.where('modality', '==', filters.bikeModality);
        }

        const bikeSnapshot = await bikesQuery.get();
        bikeUserIds = new Set();
        bikeSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.userId) bikeUserIds!.add(data.userId);
        });
    }

    // 2. Fetch Users based on demographic filters
    let usersQuery = db.collection('users').select('fcmTokens', 'country', 'state', 'city', 'gender', 'notificationPreferences');
    
    if (filters.country && filters.country !== "none") {
        usersQuery = usersQuery.where('country', '==', filters.country);
    }
    if (filters.state && filters.state !== "none") {
        usersQuery = usersQuery.where('state', '==', filters.state);
    }
    if (filters.city) {
        usersQuery = usersQuery.where('city', '==', filters.city);
    }
    if (filters.gender && filters.gender !== "none") {
        usersQuery = usersQuery.where('gender', '==', filters.gender);
    }

    const userSnapshot = await usersQuery.get();
    const targetTokens: string[] = [];

    userSnapshot.forEach(doc => {
        const userId = doc.id;
        const data = doc.data();
        const hasTokens = Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0;

        if (!hasTokens) return;

        let includeUser = false;

        // Apply intersection logic
        if (filters.targetGroup === 'without_bike') {
            if (!bikeUserIds?.has(userId)) {
                includeUser = true;
            }
        } else if (hasBikeFilters) {
            if (bikeUserIds?.has(userId)) {
                includeUser = true;
            }
        } else {
            // No specific bike filter, just count the user
            includeUser = true;
        }

        if (includeUser) {
            // Check marketing preference (default true)
            if (data.notificationPreferences?.marketing !== false) {
                 targetTokens.push(...data.fcmTokens);
            }
        }
    });
    
    // Deduplicate tokens
    return [...new Set(targetTokens)];
}


export async function estimateAudienceSize(filters: FilterParams): Promise<number> {
    try {
        const db = adminDb;
        let bikeUserIds: Set<string> | null = null;
        const hasBikeFilters = filters.bikeMake || filters.bikeModality || filters.targetGroup === 'with_bike';
        const excludeBikes = filters.targetGroup === 'without_bike';

        if (hasBikeFilters || excludeBikes) {
            let bikesQuery = db.collection('bikes').select('userId');
            if (filters.bikeMake && filters.bikeMake !== "none") bikesQuery = bikesQuery.where('make', '==', filters.bikeMake);
            if (filters.bikeModality && filters.bikeModality !== "none") bikesQuery = bikesQuery.where('modality', '==', filters.bikeModality);
            const bikeSnapshot = await bikesQuery.get();
            bikeUserIds = new Set();
            bikeSnapshot.forEach(doc => { if (doc.data().userId) bikeUserIds!.add(doc.data().userId); });
        }

        let usersQuery = db.collection('users').select('fcmTokens', 'country', 'state', 'gender', 'notificationPreferences');
        if (filters.country && filters.country !== "none") usersQuery = usersQuery.where('country', '==', filters.country);
        if (filters.state && filters.state !== "none") usersQuery = usersQuery.where('state', '==', filters.state);
        if (filters.gender && filters.gender !== "none") usersQuery = usersQuery.where('gender', '==', filters.gender);

        const userSnapshot = await usersQuery.get();
        let userCount = 0;

        userSnapshot.forEach(doc => {
            const userId = doc.id;
            const data = doc.data();
            const hasTokens = Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0;
            if (!hasTokens) return;
            
            // Check marketing preference
            if (data.notificationPreferences?.marketing === false) return;

            if (filters.targetGroup === 'without_bike') {
                if (!bikeUserIds?.has(userId)) userCount++;
            } else if (hasBikeFilters) {
                if (bikeUserIds?.has(userId)) userCount++;
            } else {
                userCount++;
            }
        });

        return userCount;

    } catch (error) {
        console.error("Error estimating audience size:", error);
        return 0;
    }
}

export async function sendNotificationCampaign(data: z.infer<typeof notificationCampaignSchema>) {
    try {
        // 1. Get Tokens
        const tokens = await getTargetTokens(data.filters);
        
        if (tokens.length === 0) {
            return { success: false, message: "No se encontraron destinatarios válidos." };
        }

        // 2. Send Notifications
        const { successCount, failureCount } = await sendMulticastNotification(
            tokens,
            data.title,
            data.body,
            {
                type: 'marketing_campaign',
                link: data.link || '',
            }
        );

        // 3. Log Campaign
        const campaignLog = {
            title: data.title,
            body: data.body,
            link: data.link,
            filters: data.filters,
            sentAt: FieldValue.serverTimestamp(),
            recipientCount: tokens.length, // Devices targeted
            successCount,
            failureCount,
            type: 'marketing'
        };

        await adminDb.collection('notification_campaigns').add(campaignLog);

        revalidatePath('/admin');
        
        return { 
            success: true, 
            message: `Campaña enviada. Éxito: ${successCount}, Fallos: ${failureCount}`,
            stats: { successCount, failureCount }
        };

    } catch (error) {
        console.error("Error sending campaign:", error);
        return { success: false, message: "Error interno al enviar la campaña." };
    }
}

export async function getCampaignHistory() {
    try {
        const snapshot = await adminDb.collection('notification_campaigns')
            .orderBy('sentAt', 'desc')
            .limit(20)
            .get();
            
        return snapshot.docs.map(doc => {
             const data = doc.data();
             return {
                 id: doc.id,
                 ...data,
                 sentAt: data.sentAt?.toDate?.()?.toISOString() || new Date().toISOString()
             };
        });
    } catch (error) {
        console.error("Error fetching history:", error);
        return [];
    }
}
