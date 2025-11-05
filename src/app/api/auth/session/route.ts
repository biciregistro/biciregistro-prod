
import { adminAuth } from "@/lib/firebase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("Authorization");
  
  if (authorization?.startsWith("Bearer ")) {
    const idToken = authorization.split("Bearer ")[1];
    
    try {
      // Verify the ID token using the imported adminAuth instance
      const decodedToken = await adminAuth.verifyIdToken(idToken);

      if (decodedToken) {
        // Generate session cookie
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await adminAuth.createSessionCookie(idToken, {
          expiresIn,
        });
        const options = {
          name: "session",
          value: sessionCookie,
          maxAge: expiresIn,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
        };

        // Add the cookie to the browser
        cookies().set(options);
        
        return NextResponse.json({ status: "success" }, { status: 200 });
      }
    } catch (error) {
      console.error("Session creation error:", error);
      return NextResponse.json({ error: "Failed to create session." }, { status: 401 });
    }
  }

  return NextResponse.json({ error: "Authorization header not found." }, { status: 400 });
}
