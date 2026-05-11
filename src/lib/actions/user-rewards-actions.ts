'use server';

import { adminDb } from '@/lib/firebase/server';

export async function getLatestActiveCampaignDate(): Promise<string | null> {
    try {
        const campaignsSnapshot = await adminDb.collection('campaigns')
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (campaignsSnapshot.empty) {
            return null;
        }

        const latestCampaign = campaignsSnapshot.docs[0].data();
        return latestCampaign.createdAt;
    } catch (error) {
        console.error('Error fetching latest campaign date:', error);
        return null;
    }
}
