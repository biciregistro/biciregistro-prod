import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/data';
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
    // If the session cookie is stale, the correct pattern is to redirect to a
    // dedicated logout route handler that can clear the cookie.
    if (error.message.includes('no user record')) {
      console.warn("Self-healing (Protected): Stale session cookie detected. Redirecting to logout handler.");
      redirect('/api/auth/logout');
    }
    // For other unexpected errors, we redirect to login as a safeguard.
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
