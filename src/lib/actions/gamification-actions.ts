'use server';

import { adminDb as db } from '../firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getDecodedSession } from '../auth/server';
import { GamificationRuleId, GAMIFICATION_RULES, KM_TIERS } from '../gamification/constants';
import { GamificationProfile, BadgeType, GamificationSettings } from '../gamification/gamification-types';

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
 * VULNERABILITY FIX: This should not be called blindly from client interfaces without server-side validation.
 */
export async function awardPoints(userId: string, actionId: GamificationRuleId, metadata?: any) {
    try {
        const session = await getDecodedSession();
        if (!session) throw new Error("Unauthorized");
        
        // SECURITY FIX: Prevent IDOR. Unless the user is an admin, they can only award points to themselves.
        // We bypass this check for referral_signup where the new user awards points to the referrer.
        if (session.uid !== userId && session.role !== 'admin' && actionId !== 'referral_signup') {
            console.error(`[SECURITY] IDOR attempt blocked. User ${session.uid} tried to award points to ${userId}`);
            return { success: false, error: 'Unauthorized action' };
        }

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
        const session = await getDecodedSession();
        if (!session) throw new Error("Unauthorized");

        // SECURITY FIX: Prevent IDOR
        if (session.uid !== userId && session.role !== 'admin') {
            console.error(`[SECURITY] IDOR attempt blocked in recordUniqueAction.`);
            return { success: false, error: 'Unauthorized action' };
        }

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
 * Action specifically for sharing events, callable from client
 */
export async function recordEventShareAction(eventId: string) {
    try {
        const session = await getDecodedSession();
        const userId = session?.uid;
        
        if (!userId) {
             return { success: false, error: 'Not authenticated' };
        }

        // 1. BLINDAJE ANTI-BOTS: Verificar que el evento es real
        // Esto evita que un script envíe IDs inventados al azar para generar puntos de la nada.
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) {
            console.warn(`[SECURITY] User ${userId} attempted to share a fake event ID: ${eventId}`);
            return { success: false, error: 'El evento no existe' };
        }

        // 2. VULNERABILITY FIX: Prevent infinite farming for the same event
        // We check if the user has already shared THIS specific event
        const historyRef = db.collection('gamification_history')
            .where('userId', '==', userId)
            .where('actionId', '==', 'event_share')
            .where('metadata.eventId', '==', eventId)
            .limit(1);
            
        const snapshot = await historyRef.get();
        if (!snapshot.empty) {
            return { success: false, message: 'Ya has recibido puntos por compartir este evento' };
        }

        // 3. RATE LIMITING: Límite diario de 10 eventos compartidos pagados.
        // Esto previene que un bot extraiga los IDs de todos los eventos reales 
        // y los comparta al mismo tiempo.
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Ajustar a medianoche (inicio del día UTC)

        const todaySharesSnapshot = await db.collection('gamification_history')
            .where('userId', '==', userId)
            .where('actionId', '==', 'event_share')
            .where('createdAt', '>=', today.toISOString())
            .get();

        if (todaySharesSnapshot.size >= 10) {
            console.warn(`[RATE LIMIT] User ${userId} reached daily limit for sharing events.`);
            return { 
                success: false, 
                message: 'Has alcanzado el límite diario de recompensas por compartir. ¡Gracias por tu apoyo continuo a la comunidad!' 
            };
        }

        return await awardPoints(userId, 'event_share', { eventId });
    } catch (error) {
        console.error('Error recording event share:', error);
        return { success: false, error: 'Internal Error' };
    }
}

/**
 * Admin: Update global gamification rules
 */
export async function updateGamificationRules(rules: Record<string, number>) {
    try {
        const session = await getDecodedSession();
        // SECURITY FIX: Enforce admin role
        if (!session || session.role !== 'admin') {
            return { success: false, error: 'Unauthorized' };
        }
        
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
 * Admin: Get Strava settings from global gamification config
 */
export async function getStravaSettings(): Promise<GamificationSettings> {
    const defaultSettings: GamificationSettings = {
        pointsPerReferral: 50,
        stravaIntegrationEnabled: false, // Por defecto apagado por protección
        stravaInitialBonusPoints: 100, 
        stravaMaxDailyKmLimit: 0,      
        stravaConversionRate: 1.0,     
        stravaAllowedActivityTypes: ['Ride', 'MountainBikeRide', 'GravelRide', 'E-BikeRide', 'Handcycle'],
    };

    try {
        const doc = await db.collection('config').doc('gamification').get();
        if (doc.exists) {
            return { ...defaultSettings, ...doc.data() } as GamificationSettings;
        }
    } catch (error) {
        console.error("Error fetching Strava settings", error);
    }
    
    return defaultSettings;
}

/**
 * Admin: Update Strava configuration
 */
export async function updateStravaSettings(settings: GamificationSettings) {
    try {
        const session = await getDecodedSession();
        // SECURITY FIX: Enforce admin role
        if (!session || session.role !== 'admin') {
            return { success: false, error: 'Unauthorized' };
        }
        
        await db.collection('config').doc('gamification').set(settings, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Error updating Strava settings:', error);
        return { success: false };
    }
}

/**
 * Public: Get catalog with merged static, dynamic data, and user completion status for UI
 */
export async function getPublicGamificationCatalog() {
    try {
        const session = await getDecodedSession();
        const userId = session?.uid;
        
        // 1. Fetch dynamic rules
        const dynamicRules = await getGamificationRules();
        
        // 2. Fetch Strava Rules (HU-04)
        const stravaSettings = await getStravaSettings();

        // 3. Fetch user's completed "once" actions if authenticated
        const completedActions = new Set<string>();
        let isStravaConnected = false;

        if (userId) {
            const historySnapshot = await db.collection('gamification_history')
                .where('userId', '==', userId)
                .get();
            
            historySnapshot.docs.forEach(doc => {
                completedActions.add(doc.data().actionId);
            });

            // Check Strava Connection from User profile
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                isStravaConnected = !!data?.isStravaConnected;
            }
        }

        // 4. Map and merge regular rules
        let catalog: any[] = Object.values(GAMIFICATION_RULES).map(rule => {
            const dynamicPoints = dynamicRules && typeof dynamicRules[`${rule.id}_points`] === 'number' 
                ? dynamicRules[`${rule.id}_points`] 
                : rule.defaultPoints;

            const isOnce = ['user_signup', 'profile_completion', 'download_sticker_pdf', 'download_emergency_qr'].includes(rule.id);
            
            let isCompleted = false;
            if (isOnce) {
                if (rule.id === 'user_signup') {
                    // Si hay sesión activa (userId), el usuario ya hizo signup, sin importar el historial.
                    isCompleted = !!userId;
                } else {
                    isCompleted = completedActions.has(rule.id);
                }
            }

            return {
                id: rule.id,
                label: rule.label,
                description: rule.description,
                points: dynamicPoints,
                type: isOnce ? 'once' : 'recurring',
                completed: isCompleted,
                isStravaRule: false
            };
        });

        // 5. Inject Strava Artificial Rules ONLY if enabled globally (Kill Switch)
        if (stravaSettings.stravaIntegrationEnabled !== false) {
            catalog.push({
                id: 'strava_connect',
                label: 'Conectar tu cuenta con Strava',
                description: 'Gana B-coins por conectar tu cuenta con Strava por primera vez.',
                points: stravaSettings.stravaInitialBonusPoints,
                type: 'once',
                completed: isStravaConnected,
                isStravaRule: true,
                iconType: 'link'
            });

            catalog.push({
                id: 'strava_ride',
                label: 'Salir a rodar',
                description: `Cada kilómetro que ruedes en el mundo real se convierte en ${stravaSettings.stravaConversionRate} B-coins`,
                points: 0, // Ignored because we use customBadgeText
                type: 'recurring',
                completed: false,
                isStravaRule: true,
                iconType: 'route',
                customBadgeText: `1 KM = ${stravaSettings.stravaConversionRate}`
            });
        }

        // 6. Ordenar: No completadas primero, ordenadas por puntos. Luego las completadas.
        catalog.sort((a, b) => {
            if (a.completed === b.completed) {
                // Si ambas no están completadas, Strava Ride va al tope (es la más importante)
                if (a.id === 'strava_ride') return -1;
                if (b.id === 'strava_ride') return 1;

                return b.points - a.points; // Ambas igual estado: ordena por puntos desc
            }
            return a.completed ? 1 : -1; // No completadas van primero
        });

        return { success: true, data: catalog };
    } catch (error) {
        console.error("Error fetching public catalog", error);
        return { success: false, error: "Failed to load rules" };
    }
}