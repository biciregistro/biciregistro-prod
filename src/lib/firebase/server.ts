import { initializeApp, getApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const createFirebaseAdminApp = (): App => {
    if (getApps().length > 0) {
        return getApp();
    }

    // This robust initialization works in multiple environments:
    // 1. GCLOUD_PROJECT (production on App Hosting): Uses the env var.
    // 2. GOOGLE_APPLICATION_CREDENTIALS (local with service account file): Uses the file.
    // 3. Application Default Credentials (local with `gcloud auth` or Cloud Workstations): Infers from the environment.
    console.log("Initializing Firebase Admin SDK...");

    try {
        const app = initializeApp({
            projectId: process.env.GCLOUD_PROJECT, // Best for production
        });
        console.log("Firebase Admin SDK initialized successfully via standard method.");
        return app;
    } catch (error: any) {
        console.warn(`Standard initialization failed: ${error.message}. Attempting fallback for local/dev environments.`);
        try {
            // Fallback for local development or environments where ADC is set up
            // but the project ID isn't automatically inferred.
            const app = initializeApp();
            console.log("Firebase Admin SDK initialized successfully via fallback (ADC).");
            return app;
        } catch (fallbackError: any) {
            console.error("CRITICAL: All Firebase Admin SDK initialization methods failed.", fallbackError);
            throw new Error(
                `Could not initialize Firebase Admin SDK. Please check your environment setup. Original error: ${fallbackError.message}`
            );
        }
    }
};

export const adminApp = createFirebaseAdminApp();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
