import { redirect } from 'next/navigation';

import { getAuthenticatedUser, getBikes, getUserEventRegistrations } from '@/lib/data';
import type { User } from '@/lib/types';

import { DashboardTabs } from '@/components/dashboard/dashboard-tabs';
import { OnboardingTour } from '@/components/dashboard/onboarding-tour';
import { ActionPanel } from '@/components/dashboard/action-panel';

import { getActiveRewards, getUserRewards } from '@/lib/actions/reward-actions';

// --- Helper function to check if the user profile is complete ---
const isProfileComplete = (user: User): boolean => {
    // A profile is considered incomplete if essential fields are missing.
    // birthDate is a good indicator as it is only added on the profile edit page.
    return !!user.birthDate && !!user.country && !!user.state;
};


// --- Main Dashboard Page ---
export default async function DashboardPage() {
    const user = await getAuthenticatedUser();
    
    if (!user) {
        redirect('/login');
    }

    const profileIsComplete = isProfileComplete(user);
    
    // Concurrently fetch all necessary data to optimize loading times
    const [bikes, allRegistrations, activeRewards, userPurchases] = await Promise.all([
        profileIsComplete ? getBikes(user.id) : Promise.resolve([]),
        profileIsComplete ? getUserEventRegistrations(user.id) : Promise.resolve([]),
        getActiveRewards(),
        getUserRewards()
    ]);

    // Filter out cancelled registrations so they don't clutter the dashboard
    const registrations = allRegistrations.filter(reg => reg.status !== 'cancelled');

    return (
        <div className="container max-w-5xl mx-auto md:py-8 px-4">
            {/* Action Panel extracted */}
            <ActionPanel user={user} isComplete={profileIsComplete} />

            {/* Tabs Section now handles the layout of bikes, events and rewards including the promotional banners */}
            <div className="mt-2 md:mt-0">
                <DashboardTabs 
                    bikes={bikes} 
                    registrations={registrations} 
                    user={user} 
                    isProfileComplete={profileIsComplete}
                    activeRewards={activeRewards}
                    userPurchases={userPurchases}
                />
            </div>
            
            <OnboardingTour user={user} />
        </div>
    );
}
