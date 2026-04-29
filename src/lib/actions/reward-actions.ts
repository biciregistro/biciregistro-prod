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
 * If userCountry and userState are provided, it filters the results accordingly.
 */
export async function getActiveRewards(userCountry?: string, userState?: string): Promise<(Campaign & { advertiserName?: string, advertiserWhatsapp?: string, advertiserGoogleMapsUrl?: string })[]> {
    try {
        const now = new Date();
        const campaignsSnapshot = await db.collection('campaigns')
            .where('type', 'in', ['reward', 'giveaway', 'coupon'])
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
                 if (data.totalCoupons === undefined || data.totalCoupons === 0 || data.uniqueConversionCount < data.totalCoupons) {
                     // Check geographical scope
                     const scope = data.targetScope || 'global';
                     if (scope === 'global') {
                         campaigns.push({ ...data, id: doc.id });
                     } else if (scope === 'state' && userCountry && userState) {
                         if (data.targetCountry === userCountry && data.targetState === userState) {
                             campaigns.push({ ...data, id: doc.id });
                         }
                     }
                 }
            }
        });

        // Enrich with ONG Data (Name and Whatsapp from users, Map from ong-profiles)
        const enrichedCampaigns = await Promise.all(campaigns.map(async (c) => {
            let advertiserName = 'Aliado';
            let advertiserWhatsapp = '';
            let advertiserGoogleMapsUrl = '';
            try {
                if (c.advertiserId) {
                    const [userDoc, ongProfileDoc] = await Promise.all([
                        db.collection('users').doc(c.advertiserId).get(),
                        db.collection('ong-profiles').doc(c.advertiserId).get()
                    ]);

                    if (userDoc.exists) {
                        const userData = userDoc.data() as User;
                        advertiserName = userData.name || 'Aliado';
                        advertiserWhatsapp = userData.whatsapp || '';
                    }

                    if (ongProfileDoc.exists) {
                        const profileData = ongProfileDoc.data() as OngUser;
                        // Sobrescribimos con los datos extendidos del perfil si existen
                        if (profileData.organizationName) advertiserName = profileData.organizationName;
                        if (profileData.contactWhatsapp) advertiserWhatsapp = profileData.contactWhatsapp;
                        if (profileData.googleMapsUrl) advertiserGoogleMapsUrl = profileData.googleMapsUrl;
                    }
                }
            } catch (e) {
                 console.error('Error fetching advertiser details', e);
            }
            
            return { ...c, advertiserName, advertiserWhatsapp, advertiserGoogleMapsUrl };
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

            // Fetch Advertiser Details for snapshot
            let advertiserName = 'Aliado';
            let advertiserEmail = '';
            
            const [advertiserDoc, profileDoc] = await Promise.all([
                transaction.get(db.collection('users').doc(campaignData.advertiserId)),
                transaction.get(db.collection('ong-profiles').doc(campaignData.advertiserId))
            ]);

            if (advertiserDoc.exists) {
                const advData = advertiserDoc.data() as User;
                advertiserName = advData.name || 'Aliado';
                advertiserEmail = advData.email;
            }
            if (profileDoc.exists) {
                const profileData = profileDoc.data() as OngUser;
                if (profileData.organizationName) advertiserName = profileData.organizationName;
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
                    rewardImageUrl: campaignData.rewardImageUrl,
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
                advertiserEmail
            };
        });

        // 4. Post-Transaction side-effects (Emails)
        if (transactionResult.success) {
            const { campaignData, userData, advertiserEmail } = transactionResult;
            
            // Fire-and-forget emails
            Promise.allSettled([
                sendRewardPurchaseEmail(userData.email, {
                    userName: userData.name,
                    campaignTitle: campaignData.title,
                    advertiserName: campaignData.advertiserName || 'El Aliado',
                    description: campaignData.description || '',
                    conditions: campaignData.conditions || '',
                    endDate: campaignData.endDate,
                    imageUrl: campaignData.rewardImageUrl || campaignData.bannerImageUrl,
                    isCoupon: campaignData.type === 'coupon'
                }),
                
                advertiserEmail ? sendRewardPurchaseOngEmail(advertiserEmail, {
                    ongName: campaignData.advertiserName || 'El Aliado',
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
 * Enriches the legacy snapshot with live advertiser data (like Google Maps Url).
 */
export async function getUserRewards(): Promise<(UserReward & { advertiserGoogleMapsUrl?: string })[]> {
     try {
        const session = await getDecodedSession();
        if (!session) return [];

        const rewardsSnapshot = await db.collection('user_rewards')
            .where('userId', '==', session.uid)
            .orderBy('purchasedAt', 'desc')
            .get();

        const rewards = rewardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserReward));
        
        // Enrich with live Google Maps URL from advertiser profile
        const enrichedRewards = await Promise.all(rewards.map(async (reward) => {
            let advertiserGoogleMapsUrl = '';
            try {
                if (reward.advertiserId) {
                    const ongProfileDoc = await db.collection('ong-profiles').doc(reward.advertiserId).get();
                    if (ongProfileDoc.exists) {
                        const profileData = ongProfileDoc.data() as OngUser;
                        advertiserGoogleMapsUrl = profileData.googleMapsUrl || '';
                    }
                }
            } catch (e) {
                console.error('Error fetching live advertiser details for legacy reward', e);
            }
            return { ...reward, advertiserGoogleMapsUrl };
        }));

        return enrichedRewards;

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