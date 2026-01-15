'use server';

import { getDecodedSession } from '@/lib/auth/server';
import { adminDb } from '@/lib/firebase/server';
import { randomBytes } from 'crypto';
import { REFERRAL_TIERS } from '../gamification/constants';
import { GamificationProfile, UserStats } from '../gamification/gamification-types';

export type ReferralData = {
    referralCode: string;
    shareUrl: string;
    stats: UserStats;
    tierLabel: string;
    nextTierLabel?: string;
    referralsToNextTier?: number;
};

function generateCode(): string {
    // Generates a 8-char hex string (e.g., 'A1B2C3D4')
    return randomBytes(4).toString('hex').toUpperCase();
}

export async function getReferralData(): Promise<{ success: boolean; data?: ReferralData; error?: string }> {
    try {
        const session = await getDecodedSession();
        if (!session) return { success: false, error: 'Unauthorized' };

        const userRef = adminDb.collection('users').doc(session.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) return { success: false, error: 'User not found' };

        const userData = userDoc.data();
        let referralCode = userData?.referralCode;
        let gamification = userData?.gamification as GamificationProfile | undefined;

        // Si no tiene código, lo generamos y guardamos
        if (!referralCode) {
            referralCode = generateCode();
            
            // Check for collision (basic implementation)
            const snapshot = await adminDb.collection('users').where('referralCode', '==', referralCode).get();
            if (!snapshot.empty) {
                // Retry once if collision
                referralCode = generateCode();
            }

            const initialGamification: GamificationProfile = {
                currentTier: 'novice',
                stats: { referralsCount: 0 },
                badges: []
            };

            const updateData: any = { referralCode };
            if (!gamification) {
                updateData.gamification = initialGamification;
                gamification = initialGamification; // Update local var for response
            }

            await userRef.update(updateData);
        }

        const stats = gamification?.stats || { referralsCount: 0 };
        const count = stats.referralsCount || 0;
        
        // Calcular Tier Info
        let currentTierLabel = REFERRAL_TIERS.NOVICE.label;
        let nextTierLabel: string | undefined = REFERRAL_TIERS.BRONZE.label;
        let nextTierMin = REFERRAL_TIERS.BRONZE.min;

        if (count >= REFERRAL_TIERS.AMBASSADOR.min) {
            currentTierLabel = REFERRAL_TIERS.AMBASSADOR.label;
            nextTierLabel = undefined;
            nextTierMin = 0;
        } else if (count >= REFERRAL_TIERS.GOLD.min) {
            currentTierLabel = REFERRAL_TIERS.GOLD.label;
            nextTierLabel = REFERRAL_TIERS.AMBASSADOR.label;
            nextTierMin = REFERRAL_TIERS.AMBASSADOR.min;
        } else if (count >= REFERRAL_TIERS.SILVER.min) {
            currentTierLabel = REFERRAL_TIERS.SILVER.label;
            nextTierLabel = REFERRAL_TIERS.GOLD.label;
            nextTierMin = REFERRAL_TIERS.GOLD.min;
        } else if (count >= REFERRAL_TIERS.BRONZE.min) {
            currentTierLabel = REFERRAL_TIERS.BRONZE.label;
            nextTierLabel = REFERRAL_TIERS.SILVER.label;
            nextTierMin = REFERRAL_TIERS.SILVER.min;
        }

        const referralsToNextTier = nextTierLabel ? Math.max(0, nextTierMin - count) : 0;
        
        // Use environment variable or fallback
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
        const shareUrl = `${baseUrl}/?ref=${referralCode}`;

        return {
            success: true,
            data: {
                referralCode,
                shareUrl,
                stats,
                tierLabel: currentTierLabel,
                nextTierLabel,
                referralsToNextTier
            }
        };

    } catch (error) {
        console.error('Error fetching referral data:', error);
        return { success: false, error: 'Internal Server Error' };
    }
}

export async function processReferral(referralCode: string, newUserId: string) {
    try {
        console.log(`[Referral System] Processing referral code: ${referralCode} for new user: ${newUserId}`);
        
        // 1. Find referrer by code
        const referrerSnapshot = await adminDb.collection('users')
            .where('referralCode', '==', referralCode)
            .limit(1)
            .get();

        if (referrerSnapshot.empty) {
            console.log(`[Referral System] Invalid or expired code: ${referralCode}`);
            return;
        }

        const referrerDoc = referrerSnapshot.docs[0];
        const referrerId = referrerDoc.id;
        const referrerData = referrerDoc.data();

        // Prevent self-referral
        if (referrerId === newUserId) {
             console.log(`[Referral System] Self-referral detected. Skipping.`);
             return;
        }

        // 2. Calculate new stats
        const currentGamification = referrerData.gamification as GamificationProfile | undefined;
        const currentStats = currentGamification?.stats || { referralsCount: 0 };
        const newCount = (currentStats.referralsCount || 0) + 1;
        
        let newTier: GamificationProfile['currentTier'] = currentGamification?.currentTier || 'novice';
        
        if (newCount >= REFERRAL_TIERS.AMBASSADOR.min) newTier = 'legend'; 
        else if (newCount >= REFERRAL_TIERS.GOLD.min) newTier = 'gold';
        else if (newCount >= REFERRAL_TIERS.SILVER.min) newTier = 'silver';
        else if (newCount >= REFERRAL_TIERS.BRONZE.min) newTier = 'bronze';

        // 3. Update Referrer
        await referrerDoc.ref.update({
            'gamification.stats.referralsCount': newCount,
            'gamification.currentTier': newTier,
        });

        // 4. Link New User to Referrer
        await adminDb.collection('users').doc(newUserId).update({
            referredBy: referrerId
        });
        
        console.log(`[Referral System] Successfully linked ${newUserId} to referrer ${referrerId}. New count: ${newCount}`);

    } catch (error) {
        console.error('[Referral System] Error processing referral:', error);
    }
}
