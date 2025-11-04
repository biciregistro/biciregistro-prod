import { cookies } from 'next/headers';
import { adminAuth } from './firebase/server';
import { DecodedIdToken } from 'firebase-admin/auth';

const SESSION_COOKIE_NAME = '__session';

export async function createSession(idToken: string) {
    const cookieStore = cookies();
    console.log('AUTH: Creating session...');
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    try {
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
        cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
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
 * Verifies the session cookie and returns the decoded user token.
 * This function ONLY handles the authentication state, not user data fetching.
 * @returns {Promise<DecodedIdToken | null>} The decoded user token or null if not authenticated.
 */
export async function getDecodedSession(): Promise<DecodedIdToken | null> {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (!sessionCookie) {
        return null;
    }

    try {
        // Verify the session cookie. `checkRevoked` is true.
        const decodedIdToken = await adminAuth.verifySessionCookie(sessionCookie, true);
        return decodedIdToken;
    } catch (error: any) {
        // Session cookie is invalid or expired.
        // This is an expected error path, so we'll log it for debugging.
        console.log(`AUTH: Session cookie verification failed. Reason: ${error.message}`);
        return null;
    }
}

export async function deleteSession() {
    const cookieStore = cookies();
    console.log('AUTH: Deleting session cookie.');
    cookieStore.delete(SESSION_COOKIE_NAME);
}
