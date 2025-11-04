import { initializeApp, getApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const createFirebaseAdminApp = (): App => {
    if (getApps().length > 0) {
        return getApp();
    }

    // In a Google Cloud environment (like Cloud Workstations, Cloud Run, App Engine),
    // the SDK can automatically discover the service account credentials.
    // We just need to initialize the app without any specific credential configuration.
    // The project ID will also be inferred from the environment.
    
    // For local development outside of a Google environment, you would need to set up
    // Application Default Credentials (ADC) using `gcloud auth application-default login`.
    
    console.log("Initializing Firebase Admin SDK...");
    
    try {
        const app = initializeApp();
        console.log("Firebase Admin SDK initialized successfully.");
        return app;
    } catch (error: any) {
        console.error("Failed to initialize Firebase Admin SDK:", error);
        throw new Error(
            `Firebase Admin SDK initialization failed. This might be due to missing or invalid credentials. Ensure you are authenticated in your environment (e.g., via 'gcloud auth application-default login') or that the necessary environment variables are set. Original error: ${error.message}`
        );
    }
};

export const adminApp = createFirebaseAdminApp();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
