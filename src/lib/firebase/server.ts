// src/lib/firebase/server.ts
import { initializeApp, getApps, cert, getApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import { firebaseAdminConfig } from './config';

// --- Type-safe global declaration ---
declare global {
  var _firebaseAdminApp: App | undefined;
  var _firebaseAdminDb: Firestore | undefined;
  var _firebaseAdminAuth: Auth | undefined;
  var _firebaseAdminStorage: Storage | undefined;
}

// --- App Singleton ---
const getAdminApp = (): App => {
  if (globalThis._firebaseAdminApp) {
    return globalThis._firebaseAdminApp;
  }
  
  const { projectId, clientEmail, privateKey } = firebaseAdminConfig;
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin SDK credentials. Check your .env.local file.');
  }

  const app = getApps().length > 0 
    ? getApp() 
    : initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: `${projectId}.firebasestorage.app` // Default bucket inference
      });

  globalThis._firebaseAdminApp = app;
  return app;
};


// --- Firestore Singleton with Settings ---
const getAdminDb = (): Firestore => {
    if (globalThis._firebaseAdminDb) {
        return globalThis._firebaseAdminDb;
    }

    const db = getFirestore(getAdminApp());
    
    // Apply settings with a safety try-catch block.
    // This handles edge cases in development where the module reloads but the
    // internal Firebase SDK instance persists and retains its settings.
    try {
        db.settings({
            ignoreUndefinedProperties: true,
        });
    } catch (error: any) {
        // Only ignore the specific error about double initialization.
        // Re-throw any other configuration errors.
        if (!error.message.includes('Firestore has already been initialized')) {
            throw error;
        }
        // If we get here, it means the DB was already configured, which is fine.
    }
    
    globalThis._firebaseAdminDb = db;
    return db;
};

// --- Auth Singleton ---
const getAdminAuth = (): Auth => {
    if (globalThis._firebaseAdminAuth) {
        return globalThis._firebaseAdminAuth;
    }
    const auth = getAuth(getAdminApp());
    globalThis._firebaseAdminAuth = auth;
    return auth;
}

// --- Storage Singleton ---
const getAdminStorage = (): Storage => {
    if (globalThis._firebaseAdminStorage) {
        return globalThis._firebaseAdminStorage;
    }
    const storage = getStorage(getAdminApp());
    globalThis._firebaseAdminStorage = storage;
    return storage;
}


// --- Exports ---
const adminAuth = getAdminAuth();
const adminDb = getAdminDb();
const adminStorage = getAdminStorage();

export { adminAuth, adminDb, adminStorage };
