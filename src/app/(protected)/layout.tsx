import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/data';
import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { NotificationsInitializer } from '@/components/shared/notifications-initializer';

// This forces all pages within this layout to be dynamically rendered.
// It's essential for routes that depend on user authentication.
export const dynamic = 'force-dynamic';

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
    <div className="flex flex-col min-h-screen">
      <NotificationsInitializer userId={user.id} />
      <Header user={user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
