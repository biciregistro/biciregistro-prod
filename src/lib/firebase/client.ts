import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInWithCustomToken, type Auth, type AuthError } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider, onTokenChanged, AppCheck } from "firebase/app-check";

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
let appCheck: AppCheck | undefined;

// This promise will be resolved once Firebase and App Check are fully initialized.
let firebaseInitializationPromise: Promise<{ app: FirebaseApp; auth: Auth; db: Firestore; storage: FirebaseStorage; appCheck?: AppCheck; }> | null = null;

function initializeClientApp(): Promise<{ app: FirebaseApp; auth: Auth; db: Firestore; storage: FirebaseStorage; appCheck?: AppCheck; }> {
  if (firebaseInitializationPromise) {
    return firebaseInitializationPromise;
  }

  firebaseInitializationPromise = new Promise((resolve, reject) => {
    // This function should only be executed in the browser.
    if (typeof window === 'undefined') {
      console.warn("Firebase client initialization skipped on the server.");
      // Resolve with empty/null services for server-side compatibility if needed
      return resolve({} as any);
    }
    
    // Validate that the config keys are present
    if (!firebaseConfig.apiKey || !process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      const errorMsg = "Missing Firebase config or reCAPTCHA site key.";
      console.error(errorMsg);
      return reject(new Error(errorMsg));
    }

    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    
    // Assign services immediately
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    // Initialize App Check and wait for the token.
    try {
      if (process.env.NODE_ENV === "development") {
        (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
      
      // Listen for the first token to be ready.
      const unsubscribe = onTokenChanged(appCheck, (token) => {
        if (token) {
          console.log("App Check token received, Firebase is ready.");
          unsubscribe();
          resolve({ app, auth, db, storage, appCheck });
        }
      });
      
    } catch (error) {
      console.error("Error initializing App Check:", error);
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
// Note: These might not be fully initialized when imported.
export { app, db, auth, storage };
