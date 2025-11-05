// src/lib/firebase/server.ts
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseAdminConfig } from './config';

const ADMIN_APP_NAME = 'firebase-frameworks';

// --- Robust Admin SDK Initialization ---

function initializeAdminApp() {
  console.log('Initializing Firebase Admin SDK...');

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
      *******************************************************************************
    `;
    console.error(errorMessage);
    // Throw an error to prevent the application from starting with a broken config.
    throw new Error(errorMessage);
  }

  try {
    const app = initializeApp({
      credential: cert({
        projectId: firebaseAdminConfig.projectId,
        clientEmail: firebaseAdminConfig.clientEmail,
        privateKey: firebaseAdminConfig.privateKey,
      }),
    }, ADMIN_APP_NAME);
    
    console.log('Firebase Admin SDK initialized successfully.');
    return app;
  } catch (error: any) {
    if (error.code === 'app/duplicate-app') {
      console.log('Firebase Admin SDK already initialized.');
      return getApp(ADMIN_APP_NAME);
    }
    console.error('CRITICAL: Firebase Admin SDK initialization failed:', error);
    throw error; // Re-throw the error to halt execution if something goes wrong.
  }
}

const adminApp = getApps().length > 0 ? getApp(ADMIN_APP_NAME) : initializeAdminApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
