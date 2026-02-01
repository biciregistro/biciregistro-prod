import { adminDb } from '@/lib/firebase/server';
import { sendMulticastNotification } from '@/lib/firebase/server-messaging';
import { NotificationLog, NotificationTemplate, User } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

const TEMPLATE_COLLECTION = 'system_settings';
const LOGS_COLLECTION = 'notification_logs';
const USERS_COLLECTION = 'users';
const TEMPLATE_DOC_ID = 'notifications_theft_alert'; // Fixed ID for the theft alert template

const DEFAULT_TITLE = "🚨 ALERTA - Bicicleta robada en tu zona 🚨";
const DEFAULT_BODY = "Bicicleta {{make}} {{model}} {{color}} robada en {{location}}. {{reward_text}} Cualquier informacion contactar a {{owner_name}} via Instagram o facebook al perfil {{contact_profile}}";

// Helper para normalizar los nombres de ciudades para comparación
// Actualizado para ignorar acentos y diacríticos (ej: "Bogotá" == "bogota")
const normalizeString = (str: string | undefined) => {
    if (!str) return '';
    return str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export async function sendTheftAlert(
    bikeId: string,
    theftData: {
        make: string;
        model: string;
        color: string;
        location: string; // This corresponds to the general location description
        city: string;     // Critical for targeting
        reward?: string;
        ownerName: string;
        ownerPhone?: string;
        contactProfile?: string; // Nuevo campo
    }
) {
    console.log(`Starting theft alert process for bike ${bikeId} in ${theftData.city}`);

    // 1. Get Template (or use default)
    let template: NotificationTemplate = {
        id: TEMPLATE_DOC_ID,
        type: 'theft_alert',
        titleTemplate: DEFAULT_TITLE,
        bodyTemplate: DEFAULT_BODY,
        isActive: true,
        updatedAt: new Date().toISOString()
    };

    try {
        const templateDoc = await adminDb.collection(TEMPLATE_COLLECTION).doc(TEMPLATE_DOC_ID).get();
        if (templateDoc.exists) {
            template = templateDoc.data() as NotificationTemplate;
        }
    } catch (error) {
        console.warn('Could not fetch notification template, using default.', error);
    }

    if (!template.isActive) {
        console.log('Theft alert notifications are disabled system-wide.');
        return;
    }

    // 2. Find Users in the target Zone (City) with FCM Tokens
    // Get all users and filter in-memory to handle case-insensitivity.
    const usersSnapshot = await adminDb.collection(USERS_COLLECTION).get();

    if (usersSnapshot.empty) {
        console.log(`No users found in the database to notify.`);
        return;
    }

    const normalizedTheftCity = normalizeString(theftData.city);
    console.log(`Normalized target city: '${normalizedTheftCity}'`);

    let allTokens: string[] = [];
    let cityMatchCount = 0;

    usersSnapshot.forEach(doc => {
        const userData = doc.data() as User;
        const normalizedUserCity = normalizeString(userData.city);
        
        // **FIX**: Case-insensitive, trim-safe, and accent-insensitive comparison
        if (normalizedUserCity === normalizedTheftCity) {
            cityMatchCount++;
            if (userData.fcmTokens && Array.isArray(userData.fcmTokens) && userData.fcmTokens.length > 0) {
                // Check preferences if they exist (default to true/safe if undefined)
                if (userData.notificationPreferences?.safety !== false) {
                     allTokens.push(...userData.fcmTokens);
                }
            }
        }
    });

    console.log(`Matched ${cityMatchCount} users in city '${theftData.city}' (normalized: '${normalizedTheftCity}').`);

    if (allTokens.length === 0) {
         console.log(`No active FCM tokens found for users in ${theftData.city}.`);
         return;
    }

    // Deduplicate tokens
    allTokens = [...new Set(allTokens)];

    console.log(`Found ${allTokens.length} unique devices to notify in ${theftData.city}.`);

    // 3. Prepare Message Content
    const rewardText = theftData.reward 
        ? `se ofrece recompensa de ${theftData.reward}.` 
        : "";
    
    // Fallback if owner has no phone
    // const contactInfo = theftData.ownerPhone || "la plataforma"; // No lo usamos según el requerimiento nuevo

    let title = template.titleTemplate;
    let body = template.bodyTemplate
        .replace('{{make}}', theftData.make)
        .replace('{{model}}', theftData.model)
        .replace('{{color}}', theftData.color)
        .replace('{{location}}', theftData.location)
        .replace('{{reward_text}}', rewardText)
        .replace('{{owner_name}}', theftData.ownerName)
        .replace('{{contact_profile}}', theftData.contactProfile || 'perfil social');

    // Clean up double spaces if reward text was empty
    body = body.replace(/\s\s+/g, ' ');

    // 4. Send Notifications
    const { successCount, failureCount } = await sendMulticastNotification(allTokens, title, body, {
        type: 'theft_alert',
        bikeId: bikeId
    });

    // 5. Log the Event
    const logEntry: NotificationLog = {
        id: adminDb.collection(LOGS_COLLECTION).doc().id,
        type: 'theft_alert',
        relatedId: bikeId,
        sentAt: new Date().toISOString(),
        recipientCount: allTokens.length,
        successCount,
        failureCount,
        city: theftData.city 
    };

    try {
        await adminDb.collection(LOGS_COLLECTION).doc(logEntry.id).set(logEntry);
        // Increment global stats counter
        await adminDb.collection(TEMPLATE_COLLECTION).doc(TEMPLATE_DOC_ID).update({
            totalSent: FieldValue.increment(successCount),
            triggerCount: FieldValue.increment(1)
        });
    } catch (error) {
        console.error('Error saving notification log:', error);
    }

    console.log(`Theft alert sent. Success: ${successCount}, Failure: ${failureCount}`);
}
