import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInWithCustomToken, type Auth, type AuthError } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// This object is the single source of truth for the Firebase configuration.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- LAZY INITIALIZATION ---
// This function ensures Firebase is initialized only once and only on the client.
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

function initializeClientApp() {
  if (getApps().length > 0) {
    app = getApp();
  } else {
    // Ensure this runs only in the browser
    if (typeof window === "undefined") {
      throw new Error("Firebase client SDK can only be initialized in the browser.");
    }
    
    // Validate that the config keys are present
    if (!firebaseConfig.apiKey) {
      throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not set. The client app cannot be initialized.");
    }

    app = initializeApp(firebaseConfig);

    // Initialize App Check only on the client
    if (typeof window !== "undefined") {
      if (process.env.NODE_ENV === "development") {
        // Use the global variable for older SDK versions to enable debug mode.
        (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }

      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!),
        isTokenAutoRefreshEnabled: true
      });
    }
  }
  
  // Assign the services after ensuring the app is initialized
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

// Call the initialization function so that the services are available for export.
// This still runs when the module is first imported, but the logic inside prevents
// server-side execution.
if (typeof window !== 'undefined') {
  initializeClientApp();
}


/**
 * Signs the user in with a custom token and retrieves their ID token.
 * @param token The custom token from the server.
 * @returns An object with success status, the ID token, or an error message.
 */
export const signInWithToken = async (token: string): Promise<{ success: boolean; idToken?: string; error?: string }> => {
    // Ensure services are initialized before use
    if (!auth) {
      initializeClientApp();
    }
    try {
        const userCredential = await signInWithCustomToken(auth, token);
        const idToken = await userCredential.user.getIdToken(true); // Force refresh to get the latest token
        return { success: true, idToken };
    } catch (error) {
        const authError = error as AuthError;
        console.error("Client sign-in error:", error);
        return { success: false, error: "No se pudo iniciar sesión. Por favor, intenta de nuevo." };
    }
};

// Export the initialized services
export { app, db, auth, storage };