import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/data';
import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { User } from '@/lib/types';
import { DashboardNav } from '@/components/user-components';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: User | null = null;
  try {
    user = await getAuthenticatedUser();
  } catch (error: any) {
    if (error.message.includes('no user record')) {
      console.warn("Self-healing (Protected): Stale session cookie detected. Redirecting to logout handler.");
      redirect('/api/auth/logout');
    }
    console.error("ProtectedLayout Error: An unexpected error occurred. Redirecting to login.", error);
    redirect('/login?reason=auth_error');
  }

  if (!user) {
    redirect('/login');
  }
  
  return (
    <div className="flex min-h-screen flex-col bg-secondary/20">
      <Header user={user} />
      <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr]">
        <aside className="hidden w-[200px] flex-col md:flex">
          <DashboardNav />
        </aside>
        <main className="flex w-full flex-1 flex-col overflow-hidden">
            {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
