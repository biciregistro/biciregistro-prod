
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithCustomToken, type Auth, type AuthError } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// This object is the single source of truth for the Firebase configuration.
// It is used by both the client-side and server-side code.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize App Check
if (typeof window !== "undefined") {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!),
    isTokenAutoRefreshEnabled: true
  });
}

const db = getFirestore(app);
const auth: Auth | undefined = getApp() ? getAuth(app) : undefined;
const storage = getStorage(app);

/**
 * Signs the user in with a custom token and retrieves their ID token.
 * @param token The custom token from the server.
 * @returns An object with success status, the ID token, or an error message.
 */
export const signInWithToken = async (token: string): Promise<{ success: boolean; idToken?: string; error?: string }> => {
    if (!auth) {
      const errorMessage = "Firebase Auth is not initialized.";
      console.error(errorMessage);
      return { success: false, error: errorMessage };
    }
    try {
        const userCredential = await signInWithCustomToken(auth, token);
        const idToken = await userCredential.user.getIdToken(true); // Force refresh to get the latest token
        return { success: true, idToken };
    } catch (error) {
        const authError = error as AuthError;
        console.error("Client sign-in error:", authError);
        return { success: false, error: "No se pudo iniciar sesión. Por favor, intenta de nuevo." };
    }
};


export { app, db, auth, storage };
