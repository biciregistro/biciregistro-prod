// src/lib/firebase/server.ts
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseAdminConfig } from './config';

// A more robust way to initialize the Firebase Admin SDK.
// This pattern prevents re-initialization in hot-reload environments.
const getAdminApp = () => {
  // If the app is already initialized, return it.
  if (getApps().length > 0) {
    return getApp();
  }

  // Otherwise, initialize it.
  const { projectId, clientEmail, privateKey } = firebaseAdminConfig;

  // ==================== DIAGNOSTIC LOG ====================
  // This will print the Project ID to your server terminal when the app starts.
  // It helps verify that the environment variables are being loaded correctly.
  console.log("--- Firebase Admin SDK Initialization ---");
  console.log("Attempting to initialize with Project ID:", projectId);
  console.log("-----------------------------------------");
  // ======================================================

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin SDK credentials. Check your .env.local file.');
  }

  const app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  console.log('Firebase Admin SDK initialized successfully.');
  return app;
};

const adminApp = getAdminApp();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

export { adminAuth, adminDb };
