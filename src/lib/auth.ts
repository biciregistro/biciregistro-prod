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
    try {
        const cookieStore = cookies();
        const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        
        if (!sessionCookie) {
            return null;
        }
        
        const decodedIdToken = await adminAuth.verifySessionCookie(sessionCookie, true);
        return decodedIdToken;
    } catch (error: any) {
        // This is an expected error path for unauthenticated users or expired cookies.
        if (error.code === 'auth/session-cookie-expired' || error.code === 'auth/session-cookie-revoked') {
            // Log for debugging, but it's not a critical server error.
            console.log(`AUTH: Session cookie is invalid or expired. Reason: ${error.code}`);
        } else if (error.name === 'DynamicServerError' && error.message.includes('cookies')) {
            // This specific error can occur during static generation, it's safe to ignore.
            console.log('AUTH: DynamicServerError accessing cookies during static analysis. Returning null.');
        }
        else {
            // Log other unexpected errors.
            console.error('AUTH: Unexpected error verifying session cookie:', error);
        }
        return null;
    }
}


export async function deleteSession() {
    const cookieStore = cookies();
    console.log('AUTH: Deleting session cookie.');
    cookieStore.delete(SESSION_COOKIE_NAME);
}
