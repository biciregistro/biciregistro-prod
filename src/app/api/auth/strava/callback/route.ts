import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/server';
import { StravaConnectionData, BadgeType, GamificationSettings } from '@/lib/gamification/gamification-types';

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
        return NextResponse.redirect(`${APP_URL}/dashboard?strava=error`);
    }

    try {
        // 2. Intercambiar el código por el Access Token
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
            return NextResponse.redirect(`${APP_URL}/dashboard?strava=error`);
        }

        const tokenData = await tokenResponse.json();

        // 3. Preparar los datos de conexión
        const stravaData: StravaConnectionData = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: tokenData.expires_at, // En segundos
            athleteId: tokenData.athlete.id,
            connectedAt: new Date().toISOString(),
            lastSyncDate: new Date().toISOString(), // Empezamos a contar desde hoy
            totalKmSynced: 0,
        };

        // 4. Obtener configuración global para el bono inicial
        const settingsRef = adminDb.collection('config').doc('gamification');
        const doc = await settingsRef.get();
        const settings = doc.exists ? (doc.data() as GamificationSettings) : { stravaInitialBonusPoints: 100 };
        const bonusPoints = settings.stravaInitialBonusPoints || 0;

        // 5. Actualizar el perfil del usuario en Firestore
        const userRef = adminDb.collection('users').doc(stateUserId);
        
        // Ejecutamos en transacción para asegurar consistencia del balance
        await adminDb.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error("Usuario no encontrado");

            const userData = userDoc.data();
            const currentBalance = userData?.gamification?.pointsBalance || 0;
            const currentLifetime = userData?.gamification?.lifetimePoints || 0;
            const currentBadges = userData?.gamification?.badges || [];

            // Verificar si ya tiene la insignia para no dar bono doble en reconexiones
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

            // Actualizamos el documento con dot notation
            transaction.update(userRef, {
                'gamification.strava': stravaData,
                'gamification.pointsBalance': currentBalance + pointsToAdd,
                'gamification.lifetimePoints': currentLifetime + pointsToAdd,
                'gamification.badges': newBadges
            });
        });

        // 6. Redirigir al dashboard con éxito
        return NextResponse.redirect(`${APP_URL}/dashboard?strava=success`);

    } catch (error) {
        console.error("Error crítico en callback de Strava:", error);
        return NextResponse.redirect(`${APP_URL}/dashboard?strava=error`);
    }
}