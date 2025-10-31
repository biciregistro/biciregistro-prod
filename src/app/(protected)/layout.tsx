import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/data';
import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

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
