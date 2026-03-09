'use server';

import { adminDb as db } from '../firebase/server';
import { FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getDecodedSession } from '../auth/server';
import { revalidatePath } from 'next/cache';
import { ActionFormState, Campaign, User, UserReward, OngUser } from '../types';
import { sendRewardPurchaseEmail, sendRewardPurchaseOngEmail } from '../email/resend-service';
import { headers } from 'next/headers';

/**
 * Returns a list of active rewards with a snapshot of the advertiser name.
 */
export async function getActiveRewards(): Promise<(Campaign & { advertiserName?: string })[]> {
    try {
        const now = new Date();
        const campaignsSnapshot = await db.collection('campaigns')
            .where('type', 'in', ['reward', 'giveaway'])
            .where('status', '==', 'active')
            .get();

        const campaigns: Campaign[] = [];

        campaignsSnapshot.forEach((doc: QueryDocumentSnapshot) => {
            const data = doc.data() as Campaign;
            
            // Validate Date (in-memory for robustness)
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);
            
            if (start <= now && end >= now) {
                 // Check if it has inventory limitation
                 if (data.totalCoupons === undefined || data.totalCoupons === 0) {
                     campaigns.push({ ...data, id: doc.id });
                 } else if (data.uniqueConversionCount < data.totalCoupons) {
                     // Only push if inventory is not depleted
                     campaigns.push({ ...data, id: doc.id });
                 }
            }
        });

        // Enrich with ONG Name
        const enrichedCampaigns = await Promise.all(campaigns.map(async (c) => {
            let advertiserName = 'Aliado';
            try {
                const userDoc = await db.collection('users').doc(c.advertiserId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data() as OngUser | User;
                    advertiserName = ('organizationName' in userData ? userData.organizationName : userData.name) || 'Aliado';
                }
            } catch (e) {
                 console.error('Error fetching advertiser name', e);
            }
            
            return { ...c, advertiserName };
        }));

        // Sort by Date (newest first)
        return enrichedCampaigns.sort((a, b) => {
             // Fallback to 0 if createdAt is undefined
             const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
             const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
             return dateB - dateA;
        });

    } catch (error) {
        console.error('Error fetching rewards:', error);
        return [];
    }
}

/**
 * Purchases a reward by deducting KM from the user and saving a UserReward document.
 * Uses a Transaction to ensure atomic operation and prevent negative balances or overselling.
 */
export async function purchaseReward(campaignId: string, consentData: { accepted: boolean, text: string }): Promise<ActionFormState> {
    try {
        const session = await getDecodedSession();
        if (!session) return { error: 'Debes iniciar sesión para adquirir recompensas.' };

        if (!consentData?.accepted) {
            return { error: 'Debes aceptar los términos para continuar.' };
        }

        const userId = session.uid;
        
        // Capture Technical Evidence for Leads
        const headerList = await headers();
        const ip = headerList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
        const userAgent = headerList.get('user-agent') || 'unknown';
        const privacyPolicyVersion = 'v.2026-01-31'; 

        const campaignRef = db.collection('campaigns').doc(campaignId);
        const userRef = db.collection('users').doc(userId);
        const userRewardsCollection = db.collection('user_rewards');
        const conversionsCollection = db.collection('campaign_conversions');

        let transactionResult = await db.runTransaction(async (transaction) => {
            // 1. Reads
            const campaignDoc = await transaction.get(campaignRef);
            if (!campaignDoc.exists) throw new Error('Campaña no encontrada.');
            const campaignData = campaignDoc.data() as Campaign;

            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error('Usuario no encontrado.');
            const userData = userDoc.data() as User;

            // 2. Business Logic Validations
            if (campaignData.status !== 'active') throw new Error('Esta campaña ya no está activa.');
            
            const now = new Date();
            if (new Date(campaignData.endDate) < now) throw new Error('Esta campaña ha expirado.');

            const cost = campaignData.priceKm || 0;
            const currentBalance = userData.gamification?.pointsBalance || 0;

            if (currentBalance < cost) {
                 throw new Error(`Saldo insuficiente. Necesitas ${cost} KM pero tienes ${currentBalance} KM.`);
            }

            // Check Inventory limit
            if (campaignData.totalCoupons && campaignData.totalCoupons > 0) {
                if (campaignData.uniqueConversionCount >= campaignData.totalCoupons) {
                    throw new Error('Lo sentimos, el inventario se ha agotado.');
                }
            }

            // Check Per-User Limit
            const maxPerUser = campaignData.maxPerUser !== undefined ? campaignData.maxPerUser : 1; 
            if (maxPerUser > 0) {
                 const existingPurchasesQuery = await transaction.get(userRewardsCollection
                    .where('userId', '==', userId)
                    .where('campaignId', '==', campaignId)
                 );
                 if (existingPurchasesQuery.size >= maxPerUser) {
                      throw new Error(`Has alcanzado el límite de compras (${maxPerUser}) permitido.`);
                 }
            }

            // Fetch Advertiser Name for snapshot
            let advertiserName = 'Aliado';
            const advertiserDoc = await transaction.get(db.collection('users').doc(campaignData.advertiserId));
            if (advertiserDoc.exists) {
                const advData = advertiserDoc.data() as OngUser | User;
                advertiserName = ('organizationName' in advData ? advData.organizationName : advData.name) || 'Aliado';
            }

            // 3. Writes
            const newRewardRef = userRewardsCollection.doc();
            
            // Si es giveaway, el estatus base es 'active' (esperando sorteo). Si es reward, es 'purchased' (esperando canje físico).
            const initialStatus = campaignData.type === 'giveaway' ? 'active' : 'purchased';

            const rewardData: Omit<UserReward, 'id'> = {
                campaignId: campaignId,
                userId: userId,
                advertiserId: campaignData.advertiserId,
                status: initialStatus as any, // Cast to avoid TS enum issues if strict
                purchasedAt: new Date().toISOString(),
                pricePaidKm: cost,
                campaignSnapshot: {
                    title: campaignData.title,
                    description: campaignData.description,
                    bannerImageUrl: campaignData.bannerImageUrl,
                    conditions: campaignData.conditions,
                    endDate: campaignData.endDate,
                    advertiserName: advertiserName,
                    type: campaignData.type // Solución al error 2741 de TypeScript
                }
            };

            const conversionRef = conversionsCollection.doc();
            const conversionData = {
                campaignId,
                userId,
                userEmail: userData.email,
                userName: `${userData.name} ${userData.lastName || ''}`.trim(),
                userCity: userData.city || 'Desconocido',
                convertedAt: new Date().toISOString(),
                ipAddress: ip,
                privacyPolicyVersion: privacyPolicyVersion,
                metadata: {
                    userAgent: userAgent,
                    deviceType: 'unknown',
                    rewardId: newRewardRef.id
                },
                consent: {
                    accepted: consentData.accepted,
                    text: consentData.text,
                    timestamp: new Date().toISOString()
                }
            };

            // Deduct Points (Keep lifetimePoints intact)
            transaction.update(userRef, {
                'gamification.pointsBalance': currentBalance - cost
            });

            // Increment Campaign counters
            transaction.update(campaignRef, {
                 clickCount: FieldValue.increment(1),
                 uniqueConversionCount: FieldValue.increment(1)
            });

            // Create Reward Document
            transaction.set(newRewardRef, rewardData);

            // Create Conversion Lead Document
            transaction.set(conversionRef, conversionData);

            return { 
                success: true, 
                rewardId: newRewardRef.id, 
                campaignData: { ...campaignData, advertiserName }, 
                userData,
                // Ensure we return the raw advertiser doc so we can access email outside the transaction
                advertiserData: advertiserDoc.exists ? advertiserDoc.data() as OngUser | User : null 
            };
        });

        // 4. Post-Transaction side-effects (Emails)
        if (transactionResult.success) {
            const { campaignData, userData, advertiserData } = transactionResult;
            
            // Fire-and-forget emails
            Promise.allSettled([
                sendRewardPurchaseEmail(userData.email, {
                    userName: userData.name,
                    campaignTitle: campaignData.title,
                    advertiserName: campaignData.advertiserName || 'El Aliado',
                    description: campaignData.description || '',
                    conditions: campaignData.conditions || '',
                    endDate: campaignData.endDate,
                    imageUrl: campaignData.bannerImageUrl
                }),
                
                advertiserData?.email ? sendRewardPurchaseOngEmail(advertiserData.email, {
                    ongName: ('organizationName' in advertiserData ? advertiserData.organizationName : advertiserData.name) || 'El Aliado',
                    userName: `${userData.name} ${userData.lastName || ''}`.trim(),
                    campaignTitle: campaignData.title,
                    imageUrl: campaignData.bannerImageUrl
                }) : Promise.resolve()
            ]).then((results) => {
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        console.error(`[CRITICAL] Failed to send email ${index}:`, result.reason);
                    }
                });
            });

            revalidatePath('/dashboard/rewards');
            revalidatePath('/dashboard');
            return { success: true, message: 'Compra realizada correctamente.' };
        }

        return { error: 'Error desconocido al procesar compra.' };

    } catch (error: any) {
        console.error('Transaction failed:', error);
        return { error: error.message || 'Ocurrió un error al procesar tu compra.' };
    }
}

/**
 * Gets all rewards owned by a user (purchased or redeemed).
 */
export async function getUserRewards(): Promise<UserReward[]> {
     try {
        const session = await getDecodedSession();
        if (!session) return [];

        const rewardsSnapshot = await db.collection('user_rewards')
            .where('userId', '==', session.uid)
            .orderBy('purchasedAt', 'desc')
            .get();

        return rewardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserReward));
     } catch (error) {
         console.error('Error fetching user rewards:', error);
         return [];
     }
}

/**
 * Redeems a purchased reward in-store.
 */
export async function redeemReward(rewardId: string): Promise<ActionFormState> {
    try {
        const session = await getDecodedSession();
        if (!session) return { error: 'No autorizado.' };

        const rewardRef = db.collection('user_rewards').doc(rewardId);
        
        await db.runTransaction(async (transaction) => {
            const rewardDoc = await transaction.get(rewardRef);
            if (!rewardDoc.exists) throw new Error('Recompensa no encontrada.');
            
            const rewardData = rewardDoc.data() as UserReward;

            if (rewardData.userId !== session.uid) {
                throw new Error('Esta recompensa no te pertenece.');
            }

            if (rewardData.status === 'redeemed') {
                throw new Error('Esta recompensa ya fue canjeada anteriormente.');
            }

            if (rewardData.campaignSnapshot?.type === 'giveaway') {
                 throw new Error('Los boletos de sorteos no requieren ser canjeados manualmente.');
            }

            transaction.update(rewardRef, {
                status: 'redeemed',
                redeemedAt: new Date().toISOString()
            });
        });

        revalidatePath('/dashboard/rewards');
        return { success: true, message: 'Recompensa canjeada con éxito.' };

    } catch (error: any) {
        console.error('Error redeeming reward:', error);
        return { error: error.message || 'Error al canjear la recompensa.' };
    }
}
