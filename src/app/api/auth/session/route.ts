// src/app/api/auth/session/route.ts
import { adminAuth } from "@/lib/firebase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("Authorization");
  
  if (authorization?.startsWith("Bearer ")) {
    const idToken = authorization.split("Bearer ")[1];
    
    try {
      // Use the pre-initialized adminAuth instance directly
      const decodedToken = await adminAuth.verifyIdToken(idToken);

      if (decodedToken) {
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await adminAuth.createSessionCookie(idToken, {
          expiresIn,
        });
        
        // Create a response object to set the cookie
        const response = NextResponse.json({ status: "success" }, { status: 200 });

        // Set the cookie on the response
        response.cookies.set("session", sessionCookie, {
          maxAge: expiresIn,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
        });
        
        return response; // Return the response with the cookie
      }
    } catch (error) {
      console.error("Session creation error:", error);
      return NextResponse.json({ error: "Failed to create session." }, { status: 401 });
    }
  }

  return NextResponse.json({ error: "Authorization header not found." }, { status: 400 });
}
