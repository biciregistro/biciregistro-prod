import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/data';
import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('LAYOUT: Checking user authentication status...');
  const user = await getAuthenticatedUser();

  if (!user) {
    console.log('LAYOUT: User is NOT authenticated. Redirecting to /login.');
    redirect('/login');
  } else {
    console.log(`LAYOUT: User is authenticated: ${user.email}. Rendering protected content.`);
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
