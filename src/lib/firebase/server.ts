import { initializeApp, getApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const createFirebaseAdminApp = (): App => {
    if (getApps().length > 0) {
        return getApp();
    }

    // In a Google Cloud environment (like Cloud Workstations, Cloud Run, App Engine),
    // the SDK can automatically discover the service account credentials.
    // However, explicitly providing the projectId makes the initialization more robust.
    // The GCLOUD_PROJECT environment variable is automatically set by App Hosting.
    
    // For local development, `gcloud auth application-default login` provides credentials,
    // and the projectId is often inferred from that context. This code works for both.
    
    console.log("Initializing Firebase Admin SDK...");
    
    try {
        const app = initializeApp({
            projectId: process.env.GCLOUD_PROJECT, // Explicitly set the project ID
        });
        console.log("Firebase Admin SDK initialized successfully.");
        return app;
    } catch (error: any) {
        console.error("Failed to initialize Firebase Admin SDK:", error);
        throw new Error(
            `Firebase Admin SDK initialization failed. This might be due to missing or invalid credentials, or an undiscoverable project ID. Ensure you are authenticated in your environment. Original error: ${error.message}`
        );
    }
};

export const adminApp = createFirebaseAdminApp();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
