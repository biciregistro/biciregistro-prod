import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getOngProfile, getEventsByOngId, getOngCommunityMembers, getBikes } from '@/lib/data';
import { getAdvertiserCampaigns } from '@/lib/actions/campaign-actions';
import { OngDashboardTabs } from '@/components/ong/ong-dashboard-tabs';
import OngAnalyticsView from '@/components/ong/ong-analytics-view';

export default async function OngDashboardPage() {
    const user = await getAuthenticatedUser();

    if (!user || user.role !== 'ong') {
        redirect('/login');
    }

    // Fetch essential data parallelly
    const [ongProfileData, events, communityMembers, bikes, campaigns] = await Promise.all([
        getOngProfile(user.id),
        getEventsByOngId(user.id),
        getOngCommunityMembers(user.id),
        getBikes(user.id),
        getAdvertiserCampaigns(user.id)
    ]);

    if (!ongProfileData) {
        // Handle edge case: User has role 'ong' but no profile doc
        redirect('/dashboard/ong/profile'); 
    }

    // Merge data to satisfy OngUser type expected by the component
    const fullOngProfile = {
        ...ongProfileData,
        id: user.id,
        role: user.role,
        email: user.email,
    };

    return (
        <div className="container max-w-6xl mx-auto py-8 px-4">
            <OngDashboardTabs 
                ongProfile={fullOngProfile}
                events={events}
                communityMembers={communityMembers}
                bikes={bikes}
                campaigns={campaigns}
                statsContent={<OngAnalyticsView />}
            />
        </div>
    );
}
