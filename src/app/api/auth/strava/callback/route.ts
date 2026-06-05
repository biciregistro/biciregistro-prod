import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/server';
import { StravaConnectionData, BadgeType, GamificationSettings } from '@/lib/gamification/gamification-types';
import { FieldValue } from 'firebase-admin/firestore';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const stateUserId = searchParams.get('state'); // Este es el ID del usuario de Firebase que pasamos

    // 1. Manejo de errores desde Strava (ej. usuario denegó permisos)
    if (error === 'access_denied') {
        return NextResponse.redirect(`${APP_URL}/dashboard?strava=denied`);
    }

    if (!code || !stateUserId) {
        return NextResponse.redirect(`${APP_URL}/dashboard?tab=rewards&strava=error`);
    }

    try {
        const userRef = adminDb.collection('users').doc(stateUserId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) throw new Error("Usuario no encontrado");

        const userData = userDoc.data();
        const waitlistStatus = userData?.gamification?.strava?.waitlistStatus;
        
        // 2. Obtener configuración global para verificar cupo ANTES de quemar el token
        const settingsRef = adminDb.collection('config').doc('gamification');
        const doc = await settingsRef.get();
        const settings = doc.exists ? (doc.data() as GamificationSettings) : { stravaInitialBonusPoints: 100, stravaConnectionLimit: 10, stravaConnectedCount: 0 };
        
        const limit = settings.stravaConnectionLimit || 10;
        const currentCount = settings.stravaConnectedCount || 0;
        const isSystemFull = currentCount >= limit;

        // 3. Intercambiar el código por el Access Token
        const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: STRAVA_CLIENT_ID,
                client_secret: STRAVA_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenResponse.ok) {
            console.error("Error al obtener token de Strava", await tokenResponse.text());
            if (tokenResponse.status === 429 || tokenResponse.status === 403) {
                 return NextResponse.redirect(`${APP_URL}/dashboard?tab=rewards&strava=waitlist_auto`);
            }
            return NextResponse.redirect(`${APP_URL}/dashboard?tab=rewards&strava=error`);
        }

        const tokenData = await tokenResponse.json();
        
        // =========================================================
        // CONDICIÓN DE CARRERA: SI EL SISTEMA ESTÁ LLENO, REVOCAR Y MANDAR A WAITLIST
        // * EXCEPCIÓN: Los usuarios con "Golden Ticket" ('invited') ignoran el límite global.
        // =========================================================
        if (isSystemFull && waitlistStatus !== 'invited') {
            // A. Revocar el token inmediatamente en Strava para no consumir el cupo (Requisito 2026: Auth Header)
            try {
                await fetch('https://www.strava.com/oauth/revoke', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${tokenData.access_token}`
                    }
                });
            } catch (e) {
                console.error("Error al revocar token de emergencia:", e);
            }

            // B. Obtener el email del usuario para la lista de espera
            const emailForWaitlist = userData?.email || '';
            const firstNameForWaitlist = userData?.firstName || 'Ciclista';

            // C. Ejecutar la transacción para agregarlo a la lista de espera formalmente
            const waitlistRef = adminDb.collection('strava_waitlist').doc(stateUserId);
            await adminDb.runTransaction(async (transaction) => {
                // Insertar en colección de espera
                transaction.set(waitlistRef, {
                    userId: stateUserId,
                    email: emailForWaitlist,
                    firstName: firstNameForWaitlist,
                    requestedAt: new Date().toISOString(),
                    status: 'pending'
                });

                // Actualizar estado en perfil
                transaction.update(userRef, {
                    'gamification.strava': {
                        waitlistStatus: 'pending'
                    }
                });

                // Incrementar contador global de waitlist
                transaction.update(settingsRef, {
                    stravaWaitlistCount: FieldValue.increment(1)
                });
            });

            return NextResponse.redirect(`${APP_URL}/dashboard?tab=rewards&strava=waitlist_auto`);
        }

        // =========================================================
        // FLUJO NORMAL: SISTEMA CON CUPO O USUARIO INVITADO (VIP)
        // =========================================================

        const offsetDate = new Date();
        offsetDate.setDate(offsetDate.getDate() - 7);

        // Al sobrescribir stravaData, se elimina implícitamente waitlistStatus, lo cual es lo correcto.
        const stravaData: StravaConnectionData = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: tokenData.expires_at,
            athleteId: tokenData.athlete.id,
            connectedAt: new Date().toISOString(),
            lastSyncDate: offsetDate.toISOString(), 
            totalKmSynced: 0,
            processedActivityIds: [], 
        };

        const bonusPoints = settings.stravaInitialBonusPoints || 0;
        
        await adminDb.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
            const freshUserDoc = await transaction.get(userRef);
            if (!freshUserDoc.exists) throw new Error("Usuario no encontrado");

            const freshUserData = freshUserDoc.data();
            const currentBalance = freshUserData?.gamification?.pointsBalance || 0;
            const currentLifetime = freshUserData?.gamification?.lifetimePoints || 0;
            const currentBadges = freshUserData?.gamification?.badges || [];

            const hasConnectedBefore = currentBadges.some((b: any) => b.id === 'strava_connected');
            
            let pointsToAdd = 0;
            let newBadges = [...currentBadges];

            if (!hasConnectedBefore) {
                pointsToAdd = bonusPoints;
                newBadges.push({
                    id: 'strava_connected' as BadgeType,
                    earnedAt: new Date().toISOString()
                });
            }

            transaction.update(userRef, {
                'gamification.strava': stravaData,
                'gamification.pointsBalance': currentBalance + pointsToAdd,
                'gamification.lifetimePoints': currentLifetime + pointsToAdd,
                'gamification.badges': newBadges,
                'isStravaConnected': true
            });
            
            transaction.update(settingsRef, {
                stravaConnectedCount: FieldValue.increment(1)
            });
            
            // Si venía de un status de waitlist invitado, no necesitamos hacer nada más en la BD 
            // ya que al asignar `stravaData` borramos el estatus de waitlist. Pero limpiamos el registro en la colección de waitlist.
            if (waitlistStatus) {
               const waitlistDocRef = adminDb.collection('strava_waitlist').doc(stateUserId);
               transaction.delete(waitlistDocRef);
            }
        });

        return NextResponse.redirect(`${APP_URL}/dashboard?tab=rewards&strava=success`);

    } catch (error) {
        console.error("Error crítico en callback de Strava:", error);
        return NextResponse.redirect(`${APP_URL}/dashboard?tab=rewards&strava=error`);
    }
}