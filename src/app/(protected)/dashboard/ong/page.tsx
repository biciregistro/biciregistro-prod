
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getOngProfile, getEventsByOngId, getOngCommunityMembers } from '@/lib/data';
import { OngDashboardTabs } from '@/components/ong/ong-dashboard-tabs';
import OngAnalyticsView from '@/components/ong/ong-analytics-view'; // Import the new view
import type { OngUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

// Loading skeleton for the entire page
const PageSkeleton = () => (
    <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="flex justify-center">
            <Skeleton className="h-10 w-1/2" />
        </div>
        <Skeleton className="h-96 w-full" />
    </div>
);

export default async function OngDashboardPage() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'ong') {
    redirect('/dashboard');
  }

  // Parallel data fetching for the original dashboard content
  const [ongProfileData, events, communityMembers] = await Promise.all([
    getOngProfile(user.id),
    getEventsByOngId(user.id),
    getOngCommunityMembers(user.id)
  ]);

  if (!ongProfileData) {
      // Edge case: Auth user exists but profile doc is missing, guide to create it.
      redirect('/dashboard/ong/profile'); 
  }

  // Combine data to create the full OngUser object needed by the tabs component
  const fullOngProfile: OngUser = {
      ...ongProfileData,
      email: user.email,
      role: 'ong',
  };

  return (
    <div className="container py-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
            <Suspense fallback={<PageSkeleton />}>
                <OngDashboardTabs 
                    ongProfile={fullOngProfile}
                    events={events}
                    communityMembers={communityMembers}
                    // Pass the new analytics view as a Server Component to the client component
                    statsContent={
                        <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
                            <OngAnalyticsView />
                        </Suspense>
                    }
                />
            </Suspense>
        </div>
    </div>
  );
}
