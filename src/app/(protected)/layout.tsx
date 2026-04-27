import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getOngProfile } from '@/lib/data';
import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import { NotificationsInitializer } from '@/components/shared/notifications-initializer';
import { GamificationListener } from '@/components/shared/gamification-listener';
import { MobileBottomNav } from '@/components/dashboard/mobile-bottom-nav';
import { Suspense } from 'react';

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
  
  // Guard Clause for ONG Onboarding Flow
  // Si es ONG y no ha completado el onboarding, lo expulsamos del área protegida
  // hacia el wizard independiente.
  if (user.role === 'ong' && user.onboardingCompleted === false) {
      redirect('/ong-onboarding');
  }

  // ENRICHMENT FIX: Check if ONG user data needs to be supplemented from ong-profile
  // This handles cases where the 'users' collection record is out of sync or incomplete
  // compared to the 'ong-profiles' record.
  if (user.role === 'ong' && user.onboardingCompleted !== false) {
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
    <div className="flex flex-col min-h-screen pb-16 md:pb-0"> {/* Add padding bottom for mobile nav */}
      <NotificationsInitializer userId={user.id} />
      <GamificationListener />
      <Header user={user} />
      <main className="flex-1">{children}</main>
      {/* 
        The MobileBottomNav uses useSearchParams(), which requires it to be wrapped in a Suspense boundary
        when used inside a Server Component layout.
      */}
      <Suspense fallback={null}>
         <MobileBottomNav user={user} />
      </Suspense>
      <Footer />
    </div>
  );
}
