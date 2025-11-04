import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
import { auth } from 'firebase-admin';

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      console.error('API_SESSION_ERROR: idToken is required');
      return NextResponse.json({ error: 'idToken is required' }, { status: 400 });
    }

    // The createSession function handles setting the cookie.
    // We are also adding logs within createSession to see if it's being triggered.
    await createSession(idToken);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof auth.AuthError) {
        console.error('API_SESSION_FIREBASE_ERROR:', error);
        return NextResponse.json({ error: 'Firebase authentication error' }, { status: 401 });
    }
    console.error('API_SESSION_GENERIC_ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
