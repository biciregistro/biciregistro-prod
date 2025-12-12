import { useEffect, useState } from 'react';
import { getToken, isSupported } from 'firebase/messaging';
import { getFirebaseServices } from '@/lib/firebase/client';
import { saveFCMToken } from '@/lib/actions/bike-actions';
import { useToast } from '@/hooks/use-toast';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export const useFcmToken = (userId?: string) => {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    // Only run if we have a user and we are in the browser
    if (!userId || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const retrieveToken = async () => {
      try {
        const supported = await isSupported();
        if (!supported) {
            console.log('Firebase Messaging is not supported in this browser.');
            return;
        }

        const { messaging } = await getFirebaseServices();
        if (!messaging) return;
        
        // --- FIX START: Manually register the service worker ---
        const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Service Worker registered successfully:', swRegistration);
        // --- FIX END ---

        const currentPermission = await Notification.requestPermission();
        setPermission(currentPermission);

        if (currentPermission === 'granted') {
          const currentToken = await getToken(messaging, {
            vapidKey: VAPID_KEY, 
            // --- FIX START: Pass the explicit service worker registration ---
            serviceWorkerRegistration: swRegistration,
            // --- FIX END ---
          });

          if (currentToken) {
            setToken(currentToken);
            // Save token to backend (fire and forget)
            saveFCMToken(currentToken);
            console.log('FCM Token retrieved and saved.');
          } else {
            console.log('No registration token available. Request permission to generate one.');
          }
        } else {
             console.log('Notification permission denied.');
        }
      } catch (error) {
        // Specifically log AbortError for better debugging
        if (error instanceof DOMException && error.name === 'AbortError') {
             console.error('Service Worker registration timed out or failed.', error);
        } else {
            console.error('An error occurred while retrieving token:', error);
        }
      }
    };

    retrieveToken();
  }, [userId, toast]);

  return { token, permission };
};
