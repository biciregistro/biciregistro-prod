import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/data';
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
    // If the session cookie is stale, the correct pattern is to redirect to a
    // dedicated logout route handler that can clear the cookie.
    if (error.message.includes('no user record')) {
      console.warn("Self-healing: Stale session cookie detected. Redirecting to logout handler.");
      redirect('/api/auth/logout');
    }
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
