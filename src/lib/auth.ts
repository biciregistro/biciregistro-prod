import { cookies } from 'next/headers';
import { adminAuth } from './firebase/server';
import { DecodedIdToken } from 'firebase-admin/auth';
import { getUserById } from './data';
import { User } from './types';

const SESSION_COOKIE_NAME = '__session';

export async function createSession(idToken: string) {
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    cookies().set(SESSION_COOKIE_NAME, sessionCookie, {
        maxAge: expiresIn,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });
}

/**
 * Gets the authenticated user from the session cookie.
 * This function verifies the session cookie and then fetches the full user profile
 * from Firestore.
 * @returns {Promise<User | null>} The full user object or null if not authenticated.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
    const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
        return null;
    }
    try {
        const decodedIdToken = await adminAuth.verifySessionCookie(sessionCookie, true);
        // After verifying the token, fetch the full user profile from your database
        const user = await getUserById(decodedIdToken.uid);
        return user;
    } catch (error) {
        console.error('Error verifying session cookie or fetching user:', error);
        // If the cookie is invalid or the user doesn't exist in the DB, clear the cookie
        cookies().delete(SESSION_COOKIE_NAME);
        return null;
    }
}


export async function deleteSession() {
    cookies().delete(SESSION_COOKIE_NAME);
}
