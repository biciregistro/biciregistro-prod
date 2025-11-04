import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { deleteSession } from '@/lib/auth';

export async function GET() {
  // This route handler's sole purpose is to securely delete the session cookie.
  await deleteSession();
  
  // Redirect the user to the login page after the cookie is cleared.
  // This is a clean and safe way to ensure the user is logged out.
  redirect('/login?reason=session_cleared');
}
