// src/lib/firebase/server.ts
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseAdminConfig } from './config';

const ADMIN_APP_NAME = 'firebase-frameworks';

function initializeAdminApp() {
  const { projectId, clientEmail, privateKey } = firebaseAdminConfig;

  // Corrected the error message to report the correct environment variables
  if (!projectId || !clientEmail || !privateKey) {
    const missingVars = [
      !projectId && 'FIREBASE_PROJECT_ID',
      !clientEmail && 'FIREBASE_CLIENT_EMAIL',
      !privateKey && 'FIREBASE_PRIVATE_KEY',
    ].filter(Boolean).join(', ');

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
    throw error;
  }
}

const adminApp = initializeAdminApp();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

console.log('Firebase Admin SDK initialized successfully.');

export { adminAuth, adminDb };
