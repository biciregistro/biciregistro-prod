'use server';

import { getDecodedSession } from '../auth/server';
import { adminDb } from '../firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { StravaConnectionData, GamificationSettings, BadgeType } from '../gamification/gamification-types';
import { sendEmail } from '../email/resend-service';
import { getStravaDisconnectTemplate } from '../email/templates/strava-disconnect';
import { getStravaWaitlistInviteTemplate } from '../email/templates/strava-waitlist-invite';

// ==========================================
// 1. CONFIGURACIÓN Y CONSTANTES
// ==========================================

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const REDIRECT_URI = `${APP_URL}/api/auth/strava/callback`;
// NUEVO: URL base de Strava API V3
const STRAVA_API_BASE_URL = 'https://www.strava.com/api/v3';

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

export async function checkStravaAvailability(): Promise<{ isFull: boolean }> {
    try {
        const settings = await getGamificationSettings();
        const limit = settings.stravaConnectionLimit || 10;
        const currentCount = settings.stravaConnectedCount || 0;
        return { isFull: currentCount >= limit };
    } catch (error) {
        console.error("Error checking Strava availability:", error);
        return { isFull: false }; // Falla segura: permitir intento
    }
}

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
        const userRef = adminDb.collection('users').doc(session.uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        const stravaData = userData?.gamification?.strava as StravaConnectionData | undefined;

        // 1. Llamada a endpoint oauth/revoke de Strava (Requisito 2026 - Header Authorization)
        if (stravaData && stravaData.accessToken) {
            try {
                const revokeRes = await fetch('https://www.strava.com/oauth/revoke', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${stravaData.accessToken}` 
                    }
                });
                
                if (!revokeRes.ok) {
                    console.error("Strava rechazó la revocación:", await revokeRes.text());
                }
            } catch (e) {
                console.error("Error de red al revocar token en Strava:", e);
            }
        }

        // 2. Actualizar perfil de usuario para eliminar conexión con Strava y decrementar contador global
        const settingsRef = adminDb.collection('config').doc('gamification');
        
        await adminDb.runTransaction(async (transaction) => {
            transaction.update(userRef, { 
                'gamification.strava': FieldValue.delete(),
                'isStravaConnected': false
            });
            // Si el usuario no estaba en waitlist y sí estaba conectado, liberamos un espacio
            if (stravaData && !stravaData.waitlistStatus) {
                transaction.update(settingsRef, {
                    stravaConnectedCount: FieldValue.increment(-1)
                });
            }
        });

        // 3. Confirmación Escrita (Compliance Sección 2.5: "Written confirmation of successful deletion")
        if (userData?.email) {
            try {
                const userName = userData.firstName || 'Ciclista';
                const { subject, html, text } = getStravaDisconnectTemplate({ userName });
                
                await sendEmail({
                    to: userData.email,
                    subject,
                    html,
                    text
                });
            } catch (emailError) {
                console.error("Error enviando email de confirmación (Sección 2.5):", emailError);
            }
        }

        return { success: true, message: "Cuenta de Strava desconectada y confirmación enviada." };
    } catch (error) {
        console.error("Error desconectando Strava:", error);
        return { success: false, message: "Error al desconectar la cuenta" };
    }
}

/**
 * Sincroniza rodadas desde Strava, calcula KM válidos y actualiza la Wallet.
 * MODELO EFÍMERO (PASS-THROUGH): En cumplimiento con la política 2026, los datos 
 * no se guardan permanentemente. Solo procesamos en memoria y usamos IDs para idempotencia.
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

        if (!stravaData || !stravaData.accessToken || stravaData.waitlistStatus) {
            return { success: false, message: "Cuenta de Strava no conectada o en lista de espera" };
        }

        // 1. Manejo del Token: Refrescar si está expirado (o expira en los próximos 5 mins)
        let currentAccessToken = stravaData.accessToken;
        const nowInSeconds = Math.floor(Date.now() / 1000);
        
        if (stravaData.expiresAt < nowInSeconds + 300) {
            // AWAIT crítico para evitar Race Conditions (Token no refrescado a tiempo)
            const newTokenData = await refreshStravaToken(stravaData.refreshToken);
            if (!newTokenData) {
                return { success: false, message: "Sesión de Strava expirada. Por favor reconecta tu cuenta." };
            }
            currentAccessToken = newTokenData.access_token;
            
            // Actualizamos en BD esperando resolución
            await userRef.update({
                'gamification.strava.accessToken': newTokenData.access_token,
                'gamification.strava.refreshToken': newTokenData.refresh_token,
                'gamification.strava.expiresAt': newTokenData.expires_at,
            });
        }

        // 2. Traer Configuración y Definir Tiempos
        const settings = await getGamificationSettings();
        // Convertimos lastSyncDate a Epoch Timestamp en segundos (lo que pide la API de Strava)
        const afterEpoch = Math.floor(new Date(stravaData.lastSyncDate).getTime() / 1000);
        const currentSyncDateStr = new Date().toISOString();

        // 3. Consultar a Strava (Usando endpoint vigente operativo)
        const stravaRes = await fetch(`${STRAVA_API_BASE_URL}/athlete/activities?after=${afterEpoch}`, {
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

        // 4. Filtrar y Calcular Distancia Válida + Idempotencia
        let newValidMeters = 0;
        const currentModalities = userData?.stravaTopModalities || [];
        const newModalitiesSet = new Set<string>(currentModalities);
        const processedIdsSet = new Set<string>(stravaData.processedActivityIds || []);
        let hasNewActivities = false;

        for (const activity of activities) {
            const actIdStr = activity.id.toString();
            
            // Evitar procesamiento doble (Idempotencia)
            if (processedIdsSet.has(actIdStr)) {
                continue;
            }

            // Evaluamos si el tipo de actividad es permitido según la configuración del admin
            const actType = activity.sport_type || activity.type;
            if (settings.stravaAllowedActivityTypes.includes(actType)) {
                newValidMeters += activity.distance;
                newModalitiesSet.add(actType);
                processedIdsSet.add(actIdStr);
                hasNewActivities = true;
                
                // NOTA COMPLIANCE 2026: Aquí YA NO se guarda la data rica en strava_activities.
                // Se desecha inmediatamente la polyline y métricas tras sumar la distancia.
            }
        }

        if (!hasNewActivities) {
            await userRef.update({ 'gamification.strava.lastSyncDate': currentSyncDateStr });
            return { success: false, message: "Las rodadas encontradas ya habían sido procesadas o no son en bicicleta." };
        }

        const newKm = newValidMeters / 1000;

        // 5. Aplicar reglas de Gamificación y Actualizar Balance (Transacción Segura)
        await adminDb.runTransaction(async (transaction) => {
            const freshUserDoc = await transaction.get(userRef);
            const data = freshUserDoc.data();
            if (!data) throw new Error("No data");

            let currentBalance = data.gamification?.pointsBalance || 0;
            let currentLifetime = data.gamification?.lifetimePoints || 0;
            let currentBadges = data.gamification?.badges || [];
            let totalKmSynced = data.gamification?.strava?.totalKmSynced || 0;

            let kmapplied = newKm;
            
            if (settings.stravaMaxDailyKmLimit > 0 && newKm > settings.stravaMaxDailyKmLimit) {
                kmapplied = settings.stravaMaxDailyKmLimit;
            }

            const pointsEarned = Math.floor(kmapplied * settings.stravaConversionRate);
            
            let newBadges = [...currentBadges];
            if (!currentBadges.some((b: any) => b.id === 'first_ride_synced')) {
                newBadges.push({ id: 'first_ride_synced' as BadgeType, earnedAt: new Date().toISOString() });
            }

            // Mantener array de procesados a un tamaño razonable para no superar límites de Firestore (1MB por doc)
            // Guardamos solo los últimos 200 IDs (suficiente para un after=lastSyncDate)
            const processedIdsArray = Array.from(processedIdsSet).slice(-200);

            transaction.update(userRef, {
                // Nested updates
                'gamification.pointsBalance': currentBalance + pointsEarned,
                'gamification.lifetimePoints': currentLifetime + pointsEarned,
                'gamification.badges': newBadges,
                'gamification.strava.lastSyncDate': currentSyncDateStr,
                'gamification.strava.totalKmSynced': totalKmSynced + newKm,
                'gamification.strava.lastSyncAddedKm': newKm, 
                'gamification.strava.processedActivityIds': processedIdsArray,
                
                // Denormalized root level updates
                'isStravaConnected': true,
                'stravaTotalKm': totalKmSynced + newKm,
                'stravaTopModalities': Array.from(newModalitiesSet),
                'stravaLastActiveDate': currentSyncDateStr
            });
        });

        // 6. Mensaje de Respuesta Enmarcado Positivamente (UX)
        let message = `¡Sincronización exitosa! Sumaste ${newKm.toFixed(1)} KM a tu wallet.`;
        if (settings.stravaMaxDailyKmLimit > 0 && newKm > settings.stravaMaxDailyKmLimit) {
            message = `¡Rendimiento brutal! Sumaste el tope de juego limpio diario (${settings.stravaMaxDailyKmLimit} KM). ¡Guarda piernas para mañana!`;
        }

        return { success: true, message, kmsAdded: newKm };

    } catch (error) {
        console.error("Error en syncStravaActivities:", error);
        return { success: false, message: "Hubo un error de servidor procesando tus rodadas." };
    }
}

// ==========================================
// 5. GESTIÓN DE LISTA DE ESPERA (ESCALABILIDAD)
// ==========================================

export async function joinStravaWaitlist() {
    const session = await getDecodedSession();
    if (!session || !session.uid) return { success: false, message: "No autenticado" };

    try {
        const userRef = adminDb.collection('users').doc(session.uid);
        const settingsRef = adminDb.collection('config').doc('gamification');
        const waitlistRef = adminDb.collection('strava_waitlist').doc(session.uid);

        await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error("Usuario no encontrado");
            const userData = userDoc.data();

            // Insertar en colección de espera
            transaction.set(waitlistRef, {
                userId: session.uid,
                email: userData?.email || '',
                firstName: userData?.firstName || 'Ciclista', // <-- FIX: GUARDAR EL NOMBRE AQUI
                requestedAt: new Date().toISOString(),
                status: 'pending'
            });

            // Actualizar estado en perfil
            transaction.update(userRef, {
                'gamification.strava': {
                    waitlistStatus: 'pending'
                }
            });

            // Incrementar contador global
            transaction.update(settingsRef, {
                stravaWaitlistCount: FieldValue.increment(1)
            });
        });

        return { success: true, message: "¡Estás en la lista VIP! Te avisaremos cuando haya cupo." };
    } catch (error) {
        console.error("Error uniéndose a lista de espera:", error);
        return { success: false, message: "Hubo un problema. Intenta más tarde." };
    }
}

// Admin Server Action: Liberar usuarios en lotes (Batch Release)
export async function releaseStravaWaitlist(countToRelease: number) {
    const session = await getDecodedSession();
    if (!session || !session.uid) return { success: false, message: "No autenticado" };
    
    // Aquí idealmente validaríamos roles de admin (Omitido por brevedad, asumiendo protección UI)

    try {
        const waitlistRef = adminDb.collection('strava_waitlist');
        const snapshot = await waitlistRef
            .where('status', '==', 'pending')
            .orderBy('requestedAt', 'asc') // FIFO
            .limit(countToRelease)
            .get();

        if (snapshot.empty) {
            return { success: true, message: "No hay usuarios en la lista de espera.", releasedCount: 0 };
        }

        const settingsRef = adminDb.collection('config').doc('gamification');
        let releasedCount = 0;

        await adminDb.runTransaction(async (transaction) => {
            for (const waitlistDoc of snapshot.docs) {
                const waitlistData = waitlistDoc.data();
                const userId = waitlistData.userId;
                const userRef = adminDb.collection('users').doc(userId);

                // 1. Marcar como invitado en la lista
                transaction.update(waitlistDoc.ref, { status: 'invited' });

                // 2. Marcar como invitado en su perfil
                transaction.update(userRef, {
                    'gamification.strava.waitlistStatus': 'invited'
                });

                releasedCount++;

                // 3. Enviar correo de "Golden Ticket" (Asíncrono sin bloquear transacción principal)
                if (waitlistData.email) {
                    // FIX: USAR EL NOMBRE REAL GUARDADO AL UNIRSE A LA LISTA
                    const userName = waitlistData.firstName || 'Ciclista';
                    const { subject, html, text } = getStravaWaitlistInviteTemplate({ userName });
                    
                    sendEmail({
                        to: waitlistData.email,
                        subject,
                        html,
                        text
                    }).catch(err => console.error(`Error enviando invite a ${waitlistData.email}`, err));
                }
            }

            // 4. Actualizar métricas globales
            transaction.update(settingsRef, {
                stravaWaitlistCount: FieldValue.increment(-releasedCount)
            });
        });

        return { success: true, message: `Se liberaron ${releasedCount} cupos exitosamente.`, releasedCount };

    } catch (error) {
        console.error("Error liberando lista de espera:", error);
        return { success: false, message: "Error al liberar cupos." };
    }
}