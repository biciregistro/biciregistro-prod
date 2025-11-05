// src/lib/firebase/server.ts
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseAdminConfig } from './config';

const ADMIN_APP_NAME = 'firebase-frameworks';

function initializeAdminApp() {
  const { projectId, clientEmail, privateKey } = firebaseAdminConfig;

  if (!projectId || !clientEmail || !privateKey) {
    const missingVars = [
      !projectId && 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      !clientEmail && 'FIREBASE_CLIENT_EMAIL',
      !privateKey && 'FIREBASE_PRIVATE_KEY',
    ].filter(Boolean).join(', ');

    // This error will crash the server during startup, which is the desired behavior
    // if the required environment variables are missing.
    throw new Error(`
      *******************************************************************************
      * FIREBASE ADMIN SDK INITIALIZATION ERROR:                                    *
      * Missing required environment variables: ${missingVars}                     *
      * Please ensure your .env.local file is correctly set up for the Admin SDK.   *
      * The server will not start until this is corrected.                          *
      *******************************************************************************
    `);
  }

  try {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    }, ADMIN_APP_NAME);
  } catch (error: any) {
    if (error.code === 'app/duplicate-app') {
      return getApp(ADMIN_APP_NAME);
    }
    console.error('CRITICAL: Firebase Admin SDK initialization failed:', error);
    // Re-throw the error to ensure the server crashes on a critical failure.
    throw error;
  }
}

// Initialize the app and export the services.
// If initialization fails, the server will crash. This is the intended "fail loudly" behavior.
const adminApp = initializeAdminApp();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

console.log('Firebase Admin SDK initialized successfully.');

export { adminAuth, adminDb };
