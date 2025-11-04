import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/data';
import { forceLogout } from '@/lib/actions';
import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { User } from '@/lib/types';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: User | null = null;
  try {
    user = await getAuthenticatedUser();
  } catch (error: any) {
    // Self-healing for stale session cookies applies here as well.
    if (error.message.includes('no user record')) {
      console.warn("Self-healing (Protected): Stale session cookie detected. Forcing logout.");
      await forceLogout();
      redirect('/login?reason=stale_session'); // Redirect to login after clearing the cookie
    }
    // For other errors, we redirect to login as a safeguard.
    console.error("ProtectedLayout Error: An unexpected error occurred. Redirecting to login.", error);
    redirect('/login?reason=auth_error');
  }

  if (!user) {
    redirect('/login');
  }
  
  return (
    <div className="flex min-h-screen flex-col bg-secondary/20">
      <Header user={user} />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
