import { cookies } from 'next/headers';
import { adminAuth } from './firebase/server';
import { DecodedIdToken } from 'firebase-admin/auth';
import { getUserById } from './data';
import { User } from './types';

const SESSION_COOKIE_NAME = '__session';

export async function createSession(idToken: string) {
    console.log('AUTH: Creating session...');
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    try {
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
        cookies().set(SESSION_COOKIE_NAME, sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });
        console.log('AUTH: Session cookie created successfully.');
    } catch (error) {
        console.error('AUTH: Error creating session cookie:', error);
    }
}

/**
 * Gets the authenticated user from the session cookie.
 * This function verifies the session cookie and then fetches the full user profile
 * from Firestore.
 * @returns {Promise<User | null>} The full user object or null if not authenticated.
 * @throws Will throw an error if the session cookie is valid but the user record is not found in Firebase Auth.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
    const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
    
    if (!sessionCookie) {
        return null;
    }

    try {
        const decodedIdToken = await adminAuth.verifySessionCookie(sessionCookie, true);
        const user = await getUserById(decodedIdToken.uid);
        
        if (!user) {
            // This case is slightly different, user exists in Auth but not Firestore.
            // For now, we treat it as "not logged in".
            console.warn(`AUTH: User with UID ${decodedIdToken.uid} verified but not found in Firestore.`);
            return null;
        }

        return user;
    } catch (error: any) {
        const errorMessage = error.message || 'An unknown error occurred';
        
        // Check for the specific error indicating the user doesn't exist in Firebase Auth.
        // We need to re-throw this so the UI layer can catch it and handle self-healing (logout).
        if (errorMessage.includes('no user record')) {
            console.error(`AUTH: Stale session cookie error: ${errorMessage}`);
            throw new Error(errorMessage); // Re-throw the specific error
        }

        // For other errors (e.g., cookie expired, malformed), we just log and return null.
        console.log(`AUTH: Session cookie verification failed, user is not authenticated. Reason: ${errorMessage}`);
        return null;
    }
}


export async function deleteSession() {
    console.log('AUTH: Deleting session cookie.');
    cookies().delete(SESSION_COOKIE_NAME);
}
