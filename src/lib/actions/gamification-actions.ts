'use server';

import { adminDb as db } from '../firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getDecodedSession } from '../auth/server';
import { GamificationRuleId, GAMIFICATION_RULES, KM_TIERS } from '../gamification/constants';
import { GamificationProfile, BadgeType } from '../gamification/gamification-types';

/**
 * Helper to get the current points value for an action.
 * Falls back to constant if no dynamic rule is set.
 */
export async function getActionPoints(actionId: GamificationRuleId): Promise<number> {
    try {
        const rulesDoc = await db.collection('gamification_rules').doc('active_rules').get();
        if (rulesDoc.exists) {
            const data = rulesDoc.data();
            // Check if rule override exists (e.g., 'referral_signup_points')
            if (data && typeof data[`${actionId}_points`] === 'number') {
                return data[`${actionId}_points`];
            }
        }
    } catch (error) {
        console.error(`Error fetching points for ${actionId}:`, error);
    }
    // Fallback to constant
    return GAMIFICATION_RULES[actionId].defaultPoints;
}

/**
 * Awards points (KM) to a user for a specific action.
 * Handles tier upgrades automatically.
 */
export async function awardPoints(userId: string, actionId: GamificationRuleId, metadata?: any) {
    try {
        const pointsToAward = await getActionPoints(actionId);
        const userRef = db.collection('users').doc(userId);
        
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) return;

            const userData = userDoc.data();
            const currentGamification = userData?.gamification as GamificationProfile || {
                stats: { referralsCount: 0, kmTraveled: 0 },
                currentTier: 'novice',
                badges: [],
                pointsBalance: 0,
                lifetimePoints: 0
            };

            // Calculate new totals
            const newLifetimePoints = (currentGamification.lifetimePoints || 0) + pointsToAward;
            const newBalance = (currentGamification.pointsBalance || 0) + pointsToAward;
            
            // Update Stats based on action type
            const newStats = { ...currentGamification.stats };
            if (actionId === 'referral_signup') {
                newStats.referralsCount = (newStats.referralsCount || 0) + 1;
            } else if (actionId === 'bike_registration') {
                newStats.bikesRegistered = (newStats.bikesRegistered || 0) + 1;
            }

            // Check Tier Upgrade
            let newTier = currentGamification.currentTier;
            let newBadges = [...(currentGamification.badges || [])];

            if (newLifetimePoints >= KM_TIERS.AMBASSADOR.min) {
                newTier = 'legend'; 
                if (!newBadges.find(b => b.id === KM_TIERS.AMBASSADOR.badgeId)) {
                    newBadges.push({ id: KM_TIERS.AMBASSADOR.badgeId, earnedAt: new Date().toISOString() });
                }
            } else if (newLifetimePoints >= KM_TIERS.GOLD.min) {
                newTier = 'gold';
                if (!newBadges.find(b => b.id === KM_TIERS.GOLD.badgeId)) {
                    newBadges.push({ id: KM_TIERS.GOLD.badgeId, earnedAt: new Date().toISOString() });
                }
            } else if (newLifetimePoints >= KM_TIERS.SILVER.min) {
                newTier = 'silver';
                 if (!newBadges.find(b => b.id === KM_TIERS.SILVER.badgeId)) {
                    newBadges.push({ id: KM_TIERS.SILVER.badgeId, earnedAt: new Date().toISOString() });
                }
            } else if (newLifetimePoints >= KM_TIERS.BRONZE.min) {
                newTier = 'bronze';
                 if (!newBadges.find(b => b.id === KM_TIERS.BRONZE.badgeId)) {
                    newBadges.push({ id: KM_TIERS.BRONZE.badgeId, earnedAt: new Date().toISOString() });
                }
            }

            // Update User Profile
            transaction.update(userRef, {
                'gamification.stats': newStats,
                'gamification.pointsBalance': newBalance,
                'gamification.lifetimePoints': newLifetimePoints,
                'gamification.currentTier': newTier,
                'gamification.badges': newBadges,
                'lastActivityAt': new Date().toISOString()
            });

            // Log Transaction History
            const historyRef = db.collection('gamification_history').doc();
            transaction.set(historyRef, {
                userId,
                actionId,
                points: pointsToAward,
                previousBalance: currentGamification.pointsBalance || 0,
                newBalance,
                metadata,
                createdAt: new Date().toISOString()
            });
        });

        console.log(`Awarded ${pointsToAward} KM to user ${userId} for ${actionId}`);
        return { success: true, points: pointsToAward };

    } catch (error) {
        console.error('Error awarding points:', error);
        return { success: false, error: 'Transaction failed' };
    }
}

/**
 * Registra una acción única (como descargar PDF) y otorga puntos si es la primera vez.
 */
export async function recordUniqueAction(userId: string, actionId: GamificationRuleId, metadata?: any) {
    try {
        const historyRef = db.collection('gamification_history')
            .where('userId', '==', userId)
            .where('actionId', '==', actionId)
            .limit(1);
        
        const snapshot = await historyRef.get();
        if (!snapshot.empty) {
            return { success: false, message: 'Action already rewarded' };
        }

        return await awardPoints(userId, actionId, metadata);
    } catch (error) {
        console.error('Error recording unique action:', error);
        return { success: false, error: 'Internal Error' };
    }
}

/**
 * Admin: Update global gamification rules
 */
export async function updateGamificationRules(rules: Record<string, number>) {
    try {
        const session = await getDecodedSession();
        // Add admin check here if needed
        
        await db.collection('gamification_rules').doc('active_rules').set(rules, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Error updating rules:', error);
        return { success: false };
    }
}

/**
 * Admin: Get current rules
 */
export async function getGamificationRules() {
    try {
        const doc = await db.collection('gamification_rules').doc('active_rules').get();
        return doc.exists ? doc.data() : {};
    } catch (error) {
        return {};
    }
}

/**
 * Public: Get catalog with merged static and dynamic data for UI
 */
export async function getPublicGamificationCatalog() {
    try {
        const dynamicRules = await getGamificationRules();
        
        const catalog = Object.values(GAMIFICATION_RULES).map(rule => {
            // Check dynamic override
            const dynamicPoints = dynamicRules && typeof dynamicRules[`${rule.id}_points`] === 'number' 
                ? dynamicRules[`${rule.id}_points`] 
                : rule.defaultPoints;

            return {
                id: rule.id,
                label: rule.label,
                description: rule.description,
                points: dynamicPoints,
                type: ['user_signup', 'profile_completion', 'download_sticker_pdf', 'download_emergency_qr'].includes(rule.id) ? 'once' : 'recurring'
            };
        });

        // Ordenar por puntos (opcional)
        return { success: true, data: catalog.sort((a, b) => b.points - a.points) };
    } catch (error) {
        console.error("Error fetching public catalog", error);
        return { success: false, error: "Failed to load rules" };
    }
}
