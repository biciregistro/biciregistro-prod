// src/lib/firebase/config.ts

// This configuration is used by both client and server.
// It is crucial that all environment variables are defined in your .env.local file.

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  // Trim any whitespace from the project ID.
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};


// This configuration is used ONLY by the server-side Admin SDK.
export const firebaseAdminConfig = {
  // Use the dedicated server-side environment variable.
  projectId: process.env.FIREBASE_PROJECT_ID?.trim(),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim(),
  // Ensure the private key is correctly formatted by replacing escaped newlines.
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};
