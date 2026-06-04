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
        // 2. Intercambiar el código por el Access Token
        // NOTA: Se mantiene la base URL antigua para el intercambio de tokens por ahora, 
        // pero la llamada principal se hace a api-v3 en strava-actions.ts según la política 2026.
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
            
            // Intercepción de Errores Tardíos (Limit Exceeded / Rate Limit)
            if (tokenResponse.status === 429 || tokenResponse.status === 403) {
                 return NextResponse.redirect(`${APP_URL}/dashboard?tab=rewards&strava=waitlist_auto`);
            }
            
            return NextResponse.redirect(`${APP_URL}/dashboard?tab=rewards&strava=error`);
        }

        const tokenData = await tokenResponse.json();
        
        // Offset de 7 días para capturar historial inicial y mejorar UX (Evita pérdida de actividades)
        const offsetDate = new Date();
        offsetDate.setDate(offsetDate.getDate() - 7);

        // 3. Preparar los datos de conexión
        const stravaData: StravaConnectionData = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: tokenData.expires_at, // En segundos
            athleteId: tokenData.athlete.id,
            connectedAt: new Date().toISOString(),
            lastSyncDate: offsetDate.toISOString(), // Empezamos a contar desde hace 7 días
            totalKmSynced: 0,
            processedActivityIds: [], // Inicializamos array de idempotencia
        };

        // 4. Obtener configuración global para el bono inicial y límites
        const settingsRef = adminDb.collection('config').doc('gamification');
        const doc = await settingsRef.get();
        const settings = doc.exists ? (doc.data() as GamificationSettings) : { stravaInitialBonusPoints: 100, stravaConnectionLimit: 10, stravaConnectedCount: 0 };
        const bonusPoints = settings.stravaInitialBonusPoints || 0;
        
        // 5. Verificar si hay cupo disponible (Límite de Atletas)
        const limit = settings.stravaConnectionLimit || 10;
        const currentCount = settings.stravaConnectedCount || 0;
        
        // Si el límite se alcanzó JUSTO antes de que el usuario completara el OAuth (Race condition)
        if (currentCount >= limit) {
             // Inscribir automáticamente en la lista de espera
             return NextResponse.redirect(`${APP_URL}/dashboard?tab=rewards&strava=waitlist_auto`);
        }

        // 6. Actualizar el perfil del usuario y el contador global en Firestore
        const userRef = adminDb.collection('users').doc(stateUserId);
        
        // Ejecutamos en transacción para asegurar consistencia del balance y del contador
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
            // También inyectamos la variable "isStravaConnected" en la raíz para filtros de Data Analytics
            transaction.update(userRef, {
                'gamification.strava': stravaData,
                'gamification.pointsBalance': currentBalance + pointsToAdd,
                'gamification.lifetimePoints': currentLifetime + pointsToAdd,
                'gamification.badges': newBadges,
                'isStravaConnected': true
            });
            
            // Incrementamos el contador global de conexiones
            transaction.update(settingsRef, {
                stravaConnectedCount: FieldValue.increment(1)
            });
        });

        // 7. Redirigir al dashboard con éxito
        return NextResponse.redirect(`${APP_URL}/dashboard?tab=rewards&strava=success`);

    } catch (error) {
        console.error("Error crítico en callback de Strava:", error);
        return NextResponse.redirect(`${APP_URL}/dashboard?tab=rewards&strava=error`);
    }
}