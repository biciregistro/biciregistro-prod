import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/data';
import { forceLogout } from '@/lib/actions';
import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { User } from '@/lib/types';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: User | null = null;
  try {
    user = await getAuthenticatedUser();
  } catch (error: any) {
    // This is a self-healing mechanism. If the session cookie is invalid because the
    // user was deleted from Firebase Auth, this error will be thrown. We catch it,
    // force a logout to clear the bad cookie, and redirect to the homepage.
    if (error.message.includes('no user record')) {
      console.warn("Self-healing: Stale session cookie detected. Forcing logout.");
      await forceLogout();
      redirect('/');
    }
    // For other unexpected errors, we'll just log them but not block rendering.
    console.error("PublicLayout Error: An unexpected error occurred while fetching user.", error);
  }
  
  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
