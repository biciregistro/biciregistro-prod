// src/app/api/auth/session/route.ts
import { adminAuth } from "@/lib/firebase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Import the constant to ensure consistency
const SESSION_COOKIE_NAME = '__session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = body.idToken;

    if (!idToken) {
      return NextResponse.json({ error: "idToken not found in request body." }, { status: 400 });
    }
  
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });
    
    // Create a response object to set the cookie
    const response = NextResponse.json({ status: "success" }, { status: 200 });

    // Set the cookie on the response using the correct, consistent name
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: '/',
    });
    
    return response; // Return the response with the cookie

  } catch (error: any) {
    console.error("Session creation error:", error);
    // Check if the error is due to an invalid token
    if (error.code === 'auth/invalid-id-token' || error.code === 'auth/id-token-revoked') {
      return NextResponse.json({ error: "Invalid ID token." }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create session." }, { status: 500 });
  }
}
