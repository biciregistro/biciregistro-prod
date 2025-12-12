import { adminDb } from '@/lib/firebase/server';
import { sendMulticastNotification } from '@/lib/firebase/server-messaging';
import { NotificationLog, NotificationTemplate, User } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

const TEMPLATE_COLLECTION = 'system_settings';
const LOGS_COLLECTION = 'notification_logs';
const USERS_COLLECTION = 'users';
const TEMPLATE_DOC_ID = 'notifications_theft_alert'; // Fixed ID for the theft alert template

const DEFAULT_TITLE = "🚨 ALERTA - Bicicleta robada en tu zona 🚨";
const DEFAULT_BODY = "Bicicleta {{make}} {{model}} {{color}} robada en {{location}}. {{reward_text}} Cualquier informacion contactar a {{owner_name}} al {{owner_phone}}";

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
    // Optimized query: only get users in the city who likely have tokens (we can't query array-contains non-empty, so we get all in city)
    // Note: In a real large-scale app, we would use FCM Topics subscription per city.
    const usersSnapshot = await adminDb.collection(USERS_COLLECTION)
        .where('city', '==', theftData.city)
        .get();

    if (usersSnapshot.empty) {
        console.log(`No users found in ${theftData.city} to notify.`);
        return;
    }

    let allTokens: string[] = [];
    usersSnapshot.forEach(doc => {
        const userData = doc.data() as User;
        // Filter out the owner of the stolen bike (if they are in the same city, which is likely)
        // We assume bikeId check is not needed here as we don't have owner ID passed explicitly, 
        // but the notification is unlikely to be annoying to the victim themselves if they receive it.
        // However, we should filter by preferences if implemented.
        
        if (userData.fcmTokens && Array.isArray(userData.fcmTokens) && userData.fcmTokens.length > 0) {
            // Check preferences if they exist (default to true/safe if undefined)
            if (userData.notificationPreferences?.safety !== false) {
                 allTokens.push(...userData.fcmTokens);
            }
        }
    });

    if (allTokens.length === 0) {
         console.log(`No active FCM tokens found for users in ${theftData.city}.`);
         return;
    }

    // Deduplicate tokens
    allTokens = [...new Set(allTokens)];

    console.log(`Found ${allTokens.length} devices to notify in ${theftData.city}.`);

    // 3. Prepare Message Content
    const rewardText = theftData.reward 
        ? `se ofrece recompensa de ${theftData.reward}.` 
        : "";
    
    // Fallback if owner has no phone
    const contactInfo = theftData.ownerPhone || "la plataforma";

    let title = template.titleTemplate;
    let body = template.bodyTemplate
        .replace('{{make}}', theftData.make)
        .replace('{{model}}', theftData.model)
        .replace('{{color}}', theftData.color)
        .replace('{{location}}', theftData.location) // Or theftData.city depending on desired granularity
        .replace('{{reward_text}}', rewardText)
        .replace('{{owner_name}}', theftData.ownerName)
        .replace('{{owner_phone}}', contactInfo);

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
        location: theftData.city
    };

    try {
        await adminDb.collection(LOGS_COLLECTION).doc(logEntry.id).set(logEntry);
        // Increment global stats counter (optional but good for HU-03)
        await adminDb.collection(TEMPLATE_COLLECTION).doc(TEMPLATE_DOC_ID).update({
            totalSent: FieldValue.increment(successCount),
            triggerCount: FieldValue.increment(1)
        });
    } catch (error) {
        console.error('Error saving notification log:', error);
    }

    console.log(`Theft alert sent. Success: ${successCount}, Failure: ${failureCount}`);
}
