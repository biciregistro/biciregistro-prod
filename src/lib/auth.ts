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
 */
export async function getAuthenticatedUser(): Promise<User | null> {
    console.log('AUTH: Verifying authenticated user...');
    const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
    
    if (!sessionCookie) {
        console.log('AUTH: No session cookie found.');
        return null;
    }
    console.log('AUTH: Session cookie found. Verifying with Firebase...');

    try {
        const decodedIdToken = await adminAuth.verifySessionCookie(sessionCookie, true);
        console.log('AUTH: Session cookie verified successfully for UID:', decodedIdToken.uid);
        
        // After verifying the token, fetch the full user profile from your database
        const user = await getUserById(decodedIdToken.uid);
        
        if (!user) {
            console.warn(`AUTH: User with UID ${decodedIdToken.uid} verified but not found in Firestore.`);
            return null;
        }

        console.log('AUTH: Full user profile fetched from Firestore:', user.email);
        return user;
    } catch (error) {
        // Improved error logging to provide more details
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        const errorStack = error instanceof Error ? error.stack : 'No stack available';
        console.error(`AUTH: Error verifying session cookie. This is the critical failure point. Message: [${errorMessage}], Stack: [${errorStack}]`, { originalError: error });
        return null;
    }
}


export async function deleteSession() {
    console.log('AUTH: Deleting session cookie.');
    cookies().delete(SESSION_COOKIE_NAME);
}
