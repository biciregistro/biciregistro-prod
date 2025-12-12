import { adminMessaging } from './server';
import { MulticastMessage } from 'firebase-admin/messaging';

export async function sendMulticastNotification(tokens: string[], title: string, body: string, data?: Record<string, string>) {
  if (!tokens || tokens.length === 0) {
    console.log('No tokens provided for notification');
    return { successCount: 0, failureCount: 0 };
  }

  // FCM allows up to 500 tokens per multicast message.
  // Ideally we should batch this if we expect > 500 users in a zone.
  // For MVP, we'll implement simple batching.
  const batchSize = 500;
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batchTokens = tokens.slice(i, i + batchSize);
    
    const message: MulticastMessage = {
      notification: {
        title,
        body,
      },
      data,
      tokens: batchTokens,
    };

    try {
      const response = await adminMessaging.sendEachForMulticast(message);
      successCount += response.successCount;
      failureCount += response.failureCount;
      
      if (response.failureCount > 0) {
         console.warn(`Failed to send ${response.failureCount} notifications in batch.`);
         // TODO: Implement logic to clean up invalid tokens (e.g. error.code === 'messaging/registration-token-not-registered')
      }
    } catch (error) {
      console.error('Error sending multicast message batch:', error);
    }
  }

  return { successCount, failureCount };
}
