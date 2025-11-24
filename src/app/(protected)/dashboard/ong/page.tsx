import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getOngProfile, getEventsByOngId, getOngCommunityMembers } from '@/lib/data';
import { OngDashboardTabs } from '@/components/ong/ong-dashboard-tabs';
import type { OngUser } from '@/lib/types';

export default async function OngDashboardPage() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'ong') {
    redirect('/dashboard');
  }

  // Parallel data fetching
  const [ongProfileData, events, communityMembers] = await Promise.all([
    getOngProfile(user.id),
    getEventsByOngId(user.id),
    getOngCommunityMembers(user.id)
  ]);

  if (!ongProfileData) {
      // Edge case: Auth user exists but profile doc missing
      redirect('/dashboard/profile'); 
  }

  const fullOngProfile: OngUser = {
      ...ongProfileData,
      email: user.email,
      role: 'ong',
  };

  return (
    <div className="container py-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
            <OngDashboardTabs 
                ongProfile={fullOngProfile}
                events={events}
                communityMembers={communityMembers}
            />
        </div>
    </div>
  );
}
