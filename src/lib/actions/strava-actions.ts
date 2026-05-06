'use server';

import { getDecodedSession } from '../auth/server';
import { adminDb } from '../firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { StravaConnectionData, GamificationSettings, BadgeType } from '../gamification/gamification-types';
import { B2BStravaActivity } from '../types';

// ==========================================
// 1. CONFIGURACIÓN Y CONSTANTES
// ==========================================

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const REDIRECT_URI = `${APP_URL}/api/auth/strava/callback`;

// Tipos de Strava
interface StravaTokenResponse {
    token_type: string;
    expires_at: number;
    expires_in: number;
    refresh_token: string;
    access_token: string;
    athlete: { id: number };
}

interface StravaActivity {
    id: number;
    name: string;
    distance: number; // en metros
    moving_time: number; // en segundos
    elapsed_time: number; // en segundos
    total_elevation_gain: number; // en metros
    type: string;
    sport_type: string;
    start_date: string;
    average_speed: number;
    max_speed: number;
    gear_id?: string;
    map?: {
        summary_polyline?: string;
    };
}

// ==========================================
// 2. UTILIDADES DE AUTENTICACIÓN STRAVA
// ==========================================

export async function getStravaAuthUrl() {
    const session = await getDecodedSession();
    if (!session || !session.uid) {
        throw new Error("No autenticado");
    }

    if (!STRAVA_CLIENT_ID) {
        console.error("Falta STRAVA_CLIENT_ID en el entorno");
        throw new Error("Configuración de servidor incompleta");
    }

    const scope = 'activity:read_all';
    const state = session.uid; 

    return `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&approval_prompt=force&scope=${scope}&state=${state}`;
}

async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse | null> {
    try {
        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: STRAVA_CLIENT_ID,
                client_secret: STRAVA_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
        });

        if (!response.ok) {
            console.error("Error renovando token de Strava:", await response.text());
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("Excepción renovando token de Strava:", error);
        return null;
    }
}

// ==========================================
// 3. OBTENCIÓN DE CONFIGURACIÓN GLOBAL
// ==========================================

async function getGamificationSettings(): Promise<GamificationSettings> {
    const settingsRef = adminDb.collection('config').doc('gamification');
    const doc = await settingsRef.get();

    const defaultSettings: GamificationSettings = {
        pointsPerReferral: 50,
        stravaInitialBonusPoints: 100, 
        stravaMaxDailyKmLimit: 0,      
        stravaConversionRate: 1.0,     
        stravaAllowedActivityTypes: ['Ride', 'MountainBikeRide', 'GravelRide', 'E-BikeRide', 'Handcycle'],
    };

    if (!doc.exists) return defaultSettings;
    return { ...defaultSettings, ...doc.data() } as GamificationSettings;
}

// ==========================================
// 4. ACCIONES PRINCIPALES (CICLISTA)
// ==========================================

export async function disconnectStrava() {
    const session = await getDecodedSession();
    if (!session || !session.uid) return { success: false, message: "No autenticado" };

    try {
        // 1. Actualizar perfil de usuario para eliminar conexión con Strava
        const userRef = adminDb.collection('users').doc(session.uid);
        await userRef.update({ 
            'gamification.strava': FieldValue.delete(),
            'isStravaConnected': false
        });

        // 2. CUMPLIMIENTO (COMPLIANCE): Eliminar todas las actividades crudas almacenadas para este usuario.
        // Strava API Agreement Sección 7 y 4: Se deben eliminar los datos a la terminación del acceso.
        const activitiesSnapshot = await adminDb.collection('strava_activities')
            .where('userId', '==', session.uid)
            .get();

        if (!activitiesSnapshot.empty) {
            const batch = adminDb.batch();
            activitiesSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }

        return { success: true, message: "Cuenta de Strava desconectada y datos eliminados en cumplimiento." };
    } catch (error) {
        console.error("Error desconectando Strava:", error);
        return { success: false, message: "Error al desconectar la cuenta" };
    }
}

/**
 * Sincroniza rodadas desde Strava, calcula KM válidos y actualiza la Wallet.
 * IMPORTANTE: Los datos en 'strava_activities' NO PUEDEN SER USADOS para entrenar modelos de Inteligencia Artificial (Strava API Agreement Section 4).
 */
export async function syncStravaActivities() {
    const session = await getDecodedSession();
    if (!session || !session.uid) {
        return { success: false, message: "No autenticado" };
    }

    try {
        const userRef = adminDb.collection('users').doc(session.uid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) return { success: false, message: "Usuario no encontrado" };

        const userData = userDoc.data();
        const stravaData = userData?.gamification?.strava as StravaConnectionData | undefined;

        if (!stravaData || !stravaData.accessToken) {
            return { success: false, message: "Cuenta de Strava no conectada" };
        }

        // 1. Manejo del Token: Refrescar si está expirado (o expira en los próximos 5 mins)
        let currentAccessToken = stravaData.accessToken;
        const nowInSeconds = Math.floor(Date.now() / 1000);
        
        if (stravaData.expiresAt < nowInSeconds + 300) {
            const newTokenData = await refreshStravaToken(stravaData.refreshToken);
            if (!newTokenData) {
                return { success: false, message: "Sesión de Strava expirada. Por favor reconecta tu cuenta." };
            }
            currentAccessToken = newTokenData.access_token;
            
            // Actualizamos en DB (sin esperar) para no bloquear
            userRef.update({
                'gamification.strava.accessToken': newTokenData.access_token,
                'gamification.strava.refreshToken': newTokenData.refresh_token,
                'gamification.strava.expiresAt': newTokenData.expires_at,
            }).catch(console.error);
        }

        // 2. Traer Configuración y Definir Tiempos
        const settings = await getGamificationSettings();
        // Convertimos lastSyncDate a Epoch Timestamp en segundos (lo que pide la API de Strava)
        const afterEpoch = Math.floor(new Date(stravaData.lastSyncDate).getTime() / 1000);
        const currentSyncDateStr = new Date().toISOString();

        // 3. Consultar a Strava
        // Endpoint: Devuelve hasta 30 actividades por defecto, suficiente para la mayoría de syncs manuales
        const stravaRes = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${afterEpoch}`, {
            headers: { Authorization: `Bearer ${currentAccessToken}` }
        });

        if (!stravaRes.ok) {
            console.error("Error Strava API:", await stravaRes.text());
            return { success: false, message: "No pudimos conectar con Strava en este momento." };
        }

        const activities: StravaActivity[] = await stravaRes.json();

        if (!activities || activities.length === 0) {
            // Actualizamos lastSyncDate de todos modos
            await userRef.update({ 'gamification.strava.lastSyncDate': currentSyncDateStr });
            return { success: false, message: "Tu cuenta ya está al día. No encontramos rodadas nuevas." };
        }

        // 4. Filtrar y Calcular Distancia Válida + Recolección de Modalities
        let newValidMeters = 0;
        const currentModalities = userData?.stravaTopModalities || [];
        const newModalitiesSet = new Set<string>(currentModalities);
        
        // Colección para la data B2B Cruda
        const activitiesCollection = adminDb.collection('strava_activities');
        const batch = adminDb.batch();

        for (const activity of activities) {
            // Evaluamos si el tipo de actividad es permitido según la configuración del admin
            // sport_type es más específico en v3, pero type es un buen fallback
            const actType = activity.sport_type || activity.type;
            if (settings.stravaAllowedActivityTypes.includes(actType)) {
                newValidMeters += activity.distance;
                newModalitiesSet.add(actType);
                
                // Mapear y guardar la data rica para Data Intelligence
                // ADVERTENCIA DE COMPLIANCE: Esta data cruda no se puede pasar a la IA de Gemini.
                const b2bData: B2BStravaActivity = {
                    id: activity.id.toString(),
                    userId: session.uid,
                    name: activity.name,
                    distance: activity.distance,
                    movingTime: activity.moving_time,
                    elapsedTime: activity.elapsed_time,
                    totalElevationGain: activity.total_elevation_gain,
                    type: activity.type,
                    sportType: actType,
                    startDate: activity.start_date,
                    averageSpeed: activity.average_speed,
                    maxSpeed: activity.max_speed,
                    polyline: activity.map?.summary_polyline,
                    gearId: activity.gear_id,
                    syncedAt: currentSyncDateStr
                };
                
                const docRef = activitiesCollection.doc(activity.id.toString());
                batch.set(docRef, b2bData, { merge: true });
            }
        }

        // Ejecutar el guardado masivo de actividades crudas (Compliance)
        await batch.commit();

        const newKm = newValidMeters / 1000;
        
        if (newKm <= 0) {
            await userRef.update({ 'gamification.strava.lastSyncDate': currentSyncDateStr });
            return { success: false, message: "Se encontraron actividades, pero ninguna fue en bicicleta al aire libre." };
        }

        // 5. Aplicar reglas de Gamificación y Actualizar Balance
        await adminDb.runTransaction(async (transaction) => {
            const freshUserDoc = await transaction.get(userRef);
            const data = freshUserDoc.data();
            if (!data) throw new Error("No data");

            let currentBalance = data.gamification?.pointsBalance || 0;
            let currentLifetime = data.gamification?.lifetimePoints || 0;
            let currentBadges = data.gamification?.badges || [];
            let totalKmSynced = data.gamification?.strava?.totalKmSynced || 0;

            let kmapplied = newKm;
            
            // TODO: Si el Admin configuró un stravaMaxDailyKmLimit > 0, aquí tendríamos que 
            // leer cuánto ha sincronizado hoy. Por simplicidad en MVP, aplicamos el cap directamente al bloque total
            // asumiendo que el usuario sincroniza con frecuencia.
            if (settings.stravaMaxDailyKmLimit > 0 && newKm > settings.stravaMaxDailyKmLimit) {
                kmapplied = settings.stravaMaxDailyKmLimit;
            }

            const pointsEarned = Math.floor(kmapplied * settings.stravaConversionRate);
            
            let newBadges = [...currentBadges];
            let isFirstSync = false;
            if (!currentBadges.some((b: any) => b.id === 'first_ride_synced')) {
                isFirstSync = true;
                newBadges.push({ id: 'first_ride_synced' as BadgeType, earnedAt: new Date().toISOString() });
            }

            transaction.update(userRef, {
                // Nested updates
                'gamification.pointsBalance': currentBalance + pointsEarned,
                'gamification.lifetimePoints': currentLifetime + pointsEarned,
                'gamification.badges': newBadges,
                'gamification.strava.lastSyncDate': currentSyncDateStr,
                'gamification.strava.totalKmSynced': totalKmSynced + newKm,
                
                // Denormalized root level updates for Data Intelligence
                'isStravaConnected': true,
                'stravaTotalKm': totalKmSynced + newKm,
                'stravaTopModalities': Array.from(newModalitiesSet),
                'stravaLastActiveDate': currentSyncDateStr
            });
        });

        // 6. Mensaje de Respuesta
        let message = `¡Sincronización exitosa! Sumaste ${newKm.toFixed(1)} KM a tu wallet.`;
        if (settings.stravaMaxDailyKmLimit > 0 && newKm > settings.stravaMaxDailyKmLimit) {
            message = `Sincronizaste ${newKm.toFixed(1)} KM, pero se aplicó el límite diario administrativo de ${settings.stravaMaxDailyKmLimit} KM.`;
        }

        return { success: true, message, kmsAdded: newKm };

    } catch (error) {
        console.error("Error en syncStravaActivities:", error);
        return { success: false, message: "Hubo un error de servidor procesando tus rodadas." };
    }
}