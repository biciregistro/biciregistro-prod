import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInWithCustomToken, type Auth, type AuthError } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getMessaging, type Messaging, isSupported } from "firebase/messaging";
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from "firebase/app-check";

// This object is the single source of truth for the Firebase configuration.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- ROBUST LAZY INITIALIZATION ---

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let messaging: Messaging | undefined; // Messaging might not be supported
let appCheck: AppCheck | undefined;

// This promise will be resolved once Firebase services are initialized.
// Note: We don't wait for App Check token here to avoid blocking UI on token errors.
let firebaseInitializationPromise: Promise<{ app: FirebaseApp; auth: Auth; db: Firestore; storage: FirebaseStorage; messaging?: Messaging; appCheck?: AppCheck; }> | null = null;

function initializeClientApp(): Promise<{ app: FirebaseApp; auth: Auth; db: Firestore; storage: FirebaseStorage; messaging?: Messaging; appCheck?: AppCheck; }> {
  if (firebaseInitializationPromise) {
    return firebaseInitializationPromise;
  }

  firebaseInitializationPromise = new Promise(async (resolve, reject) => {
    // This function should only be executed in the browser.
    if (typeof window === 'undefined') {
      console.warn("Firebase client initialization skipped on the server.");
      return resolve({} as any);
    }
    
    // Validate that the config keys are present
    if (!firebaseConfig.apiKey || !process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      const errorMsg = "Missing Firebase config or reCAPTCHA site key.";
      console.error(errorMsg);
      // We resolve anyway to prevent app crash, but log error
      // return reject(new Error(errorMsg)); 
    }

    try {
        if (getApps().length === 0) {
          app = initializeApp(firebaseConfig);
        } else {
          app = getApp();
        }
        
        // Assign services immediately
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);

        // Initialize Messaging if supported (async but non-blocking)
        isSupported().then(supported => {
            if (supported) {
                messaging = getMessaging(app);
            }
        }).catch(e => console.warn("Messaging support check failed", e));

        // Initialize App Check (Non-blocking)
        if (process.env.NODE_ENV === "development") {
            // Prioritize env var for debug token if set, otherwise true (auto-generate)
            (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = 
                process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN || true;
        }
        
        try {
            appCheck = initializeAppCheck(app, {
                provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!),
                isTokenAutoRefreshEnabled: true
            });
            console.log("App Check initialized.");
        } catch (appCheckError) {
            console.error("Error initializing App Check:", appCheckError);
            // We do NOT reject the main promise if App Check fails
        }

        // Resolve immediately so the app can start using Auth/DB
        resolve({ app, auth, db, storage, messaging, appCheck });

    } catch (error) {
        console.error("Critical error initializing Firebase:", error);
        reject(error);
    }
  });

  return firebaseInitializationPromise;
}

// --- EXPORTED GETTER FUNCTION ---
// Use this function in your components to ensure Firebase is ready.
export const getFirebaseServices = () => {
  // Initialize on first call if not already done.
  if (!firebaseInitializationPromise) {
    initializeClientApp();
  }
  return firebaseInitializationPromise!;
};

/**
 * Signs the user in with a custom token and retrieves their ID token.
 * @param token The custom token from the server.
 * @returns An object with success status, the ID token, or an error message.
 */
export const signInWithToken = async (token: string): Promise<{ success: boolean; idToken?: string; error?: string }> => {
    try {
        const { auth } = await getFirebaseServices();
        const userCredential = await signInWithCustomToken(auth, token);
        const idToken = await userCredential.user.getIdToken(true);
        return { success: true, idToken };
    } catch (error) {
        const authError = error as AuthError;
        console.error("Client sign-in error:", error);
        return { success: false, error: "No se pudo iniciar sesión. Por favor, intenta de nuevo." };
    }
};

// Start initialization on module load for client-side environments.
if (typeof window !== 'undefined') {
  initializeClientApp();
}

// Export the initialized services for legacy usage.
export { app, db, auth, storage, messaging };
