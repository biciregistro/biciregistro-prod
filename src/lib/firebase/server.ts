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

    const errorMessage = `
      *******************************************************************************
      * FIREBASE ADMIN SDK INITIALIZATION ERROR:                                    *
      * Missing required environment variables: ${missingVars}                     *
      * Please ensure your .env.local file is correctly set up for the Admin SDK.   *
      * This is a server-side error and will prevent the app from running correctly.*
      *******************************************************************************
    `;
    // This error will be thrown ONLY on the server during startup.
    throw new Error(errorMessage);
  }

  try {
    const app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    }, ADMIN_APP_NAME);
    
    console.log('Firebase Admin SDK initialized successfully.');
    return app;
  } catch (error: any) {
    if (error.code === 'app/duplicate-app') {
      return getApp(ADMIN_APP_NAME);
    }
    console.error('CRITICAL: Firebase Admin SDK initialization failed:', error);
    throw error;
  }
}

let adminApp;
let adminAuth;
let adminDb;

try {
    adminApp = getApps().length > 0 ? getApp(ADMIN_APP_NAME) : initializeAdminApp();
    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);
} catch (error: any) {
    console.error(error.message);
    // In a production environment, you might want to handle this more gracefully.
    // For now, we'll set them to null so the app doesn't crash on import,
    // but subsequent calls will fail.
    adminAuth = null as any;
    adminDb = null as any;
}


export { adminAuth, adminDb };
