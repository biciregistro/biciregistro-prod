'use client';

import { useFcmToken } from '@/hooks/use-fcm-token';

export function NotificationsInitializer({ userId }: { userId: string }) {
  // This hook handles the side effect of requesting permission and saving the token
  useFcmToken(userId);
  
  // This component renders nothing
  return null;
}
