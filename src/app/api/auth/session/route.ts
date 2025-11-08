// src/app/api/auth/session/route.ts
import { adminAuth } from "@/lib/firebase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = '__session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = body.idToken;

    if (!idToken) {
      return NextResponse.json({ error: "ID token not found in request body." }, { status: 400 });
    }

    // --- FIX: Verify the ID token before creating a session cookie. ---
    // This step ensures that the token is valid and not revoked.
    await adminAuth.verifyIdToken(idToken);

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });
    
    const response = NextResponse.json({ status: "success" }, { status: 200 });

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: '/',
    });
    
    return response;

  } catch (error: any) {
    console.error("Session creation error:", error);
    
    // Provide a more specific error response if the token is invalid
    if (error.code === 'auth/id-token-expired' || 
        error.code === 'auth/invalid-id-token' || 
        error.code === 'auth/id-token-revoked') {
      return NextResponse.json({ error: "Unauthorized: Invalid ID token." }, { status: 401 });
    }
    
    // Generic server error for other cases
    return NextResponse.json({ error: "Failed to create session due to an internal error." }, { status: 500 });
  }
}
