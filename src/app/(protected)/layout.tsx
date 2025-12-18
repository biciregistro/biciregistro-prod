import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getOngProfile } from '@/lib/data';
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
  let user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  // ENRICHMENT FIX: Check if ONG user data needs to be supplemented from ong-profile
  // This handles cases where the 'users' collection record is out of sync or incomplete
  // compared to the 'ong-profiles' record.
  if (user.role === 'ong') {
      try {
          const ongProfile = await getOngProfile(user.id);
          if (ongProfile) {
              // Create a new user object with enriched data
              user = {
                  ...user,
                  name: ongProfile.organizationName || user.name,
                  avatarUrl: ongProfile.logoUrl || user.avatarUrl,
              };
          }
      } catch (error) {
          console.error("Error enriching ONG user data in layout:", error);
          // Continue with original user data if fetch fails
      }
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
