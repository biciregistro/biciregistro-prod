'use server';

import { getDecodedSession } from '@/lib/auth/server';
import { adminDb } from '@/lib/firebase/server';
import { randomBytes } from 'crypto';
import { KM_TIERS } from '../gamification/constants';
import { GamificationProfile, UserStats } from '../gamification/gamification-types';
import { awardPoints, getActionPoints } from './gamification-actions';

export type ReferralData = {
    referralCode: string;
    shareUrl: string;
    stats: UserStats;
    tierLabel: string;
    nextTierLabel?: string;
    kmToNextTier?: number;
    totalKm: number;
    referralPoints: number; // Añadido para el botón dinámico
};

function generateCode(): string {
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

        // Si no tiene código, lo generamos
        if (!referralCode) {
            referralCode = generateCode();
            const snapshot = await adminDb.collection('users').where('referralCode', '==', referralCode).get();
            if (!snapshot.empty) referralCode = generateCode();

            const initialGamification: GamificationProfile = {
                currentTier: 'novice',
                stats: { referralsCount: 0, kmTraveled: 0 },
                badges: [],
                pointsBalance: 0,
                lifetimePoints: 0
            };

            const updateData: any = { referralCode };
            if (!gamification) {
                updateData.gamification = initialGamification;
                gamification = initialGamification;
            }
            await userRef.update(updateData);
        }

        const stats = gamification?.stats || { referralsCount: 0, kmTraveled: 0 };
        let lifetimePoints = gamification?.lifetimePoints || 0;
        
        if (lifetimePoints === 0 && stats.referralsCount > 0) {
             lifetimePoints = stats.referralsCount * 100;
             userRef.update({
                 'gamification.lifetimePoints': lifetimePoints,
                 'gamification.pointsBalance': lifetimePoints
             }).catch(err => console.error('Migration error:', err));
        }

        // Obtener valor actual de KM por referido
        const referralPoints = await getActionPoints('referral_signup');

        // Calcular Tier Info
        let currentTierLabel = KM_TIERS.NOVICE.label;
        let nextTierLabel: string | undefined = KM_TIERS.BRONZE.label;
        let nextTierMin = KM_TIERS.BRONZE.min;

        if (lifetimePoints >= KM_TIERS.AMBASSADOR.min) {
            currentTierLabel = KM_TIERS.AMBASSADOR.label;
            nextTierLabel = undefined;
            nextTierMin = 0;
        } else if (lifetimePoints >= KM_TIERS.GOLD.min) {
            currentTierLabel = KM_TIERS.GOLD.label;
            nextTierLabel = KM_TIERS.AMBASSADOR.label;
            nextTierMin = KM_TIERS.AMBASSADOR.min;
        } else if (lifetimePoints >= KM_TIERS.SILVER.min) {
            currentTierLabel = KM_TIERS.SILVER.label;
            nextTierLabel = KM_TIERS.GOLD.label;
            nextTierMin = KM_TIERS.GOLD.min;
        } else if (lifetimePoints >= KM_TIERS.BRONZE.min) {
            currentTierLabel = KM_TIERS.BRONZE.label;
            nextTierLabel = KM_TIERS.SILVER.label;
            nextTierMin = KM_TIERS.SILVER.min;
        }

        const kmToNextTier = nextTierLabel ? Math.max(0, nextTierMin - lifetimePoints) : 0;
        
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
                kmToNextTier,
                totalKm: lifetimePoints,
                referralPoints
            }
        };

    } catch (error) {
        console.error('Error fetching referral data:', error);
        return { success: false, error: 'Internal Server Error' };
    }
}

export async function processReferral(referralCode: string, newUserId: string) {
    try {
        const referrerSnapshot = await adminDb.collection('users')
            .where('referralCode', '==', referralCode)
            .limit(1)
            .get();

        if (referrerSnapshot.empty) return;

        const referrerDoc = referrerSnapshot.docs[0];
        const referrerId = referrerDoc.id;

        if (referrerId === newUserId) return;

        await awardPoints(referrerId, 'referral_signup', { referredUserId: newUserId });

        await adminDb.collection('users').doc(newUserId).update({
            referredBy: referrerId
        });
        
    } catch (error) {
        console.error('[Referral System] Error processing referral:', error);
    }
}
