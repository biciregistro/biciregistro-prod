import { getAuthenticatedUser, getBike } from '@/lib/data';
import { notFound, redirect } from 'next/navigation';
import BikeDetailsPageClient from './page-client';
import type { User, Bike } from '@/lib/types';
import { getInsuranceRequestByBikeId } from '@/lib/actions/insurance-actions';
import { ActionPanel } from '@/components/dashboard/action-panel';

// Helper function to check if the user profile is complete (Matches profile/page.tsx)
const isProfileComplete = (user: User): boolean => {
    return !!user.birthDate && !!user.country && !!user.state;
};

// The props object is destructured directly in the function signature
export default async function BikeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  // Call getBike with both userId and bikeId for security and correctness
  const bike = await getBike(user.id, id);
  
  // If the bike is not found (e.g., wrong ID or user does not have access),
  // redirect them to the main dashboard page instead of showing a 404.
  if (!bike) {
    const redirectPath = user.role === 'ong' ? '/dashboard/ong?tab=garage' : '/dashboard';
    redirect(redirectPath);
  }

  // Fetch insurance request
  const insuranceRequest = await getInsuranceRequestByBikeId(id);
  const profileIsComplete = isProfileComplete(user);

  return (
    <div className="container max-w-6xl mx-auto px-4 md:px-0 py-6 md:py-0">
        <ActionPanel user={user} isComplete={profileIsComplete} />
        <BikeDetailsPageClient user={user} bike={bike} insuranceRequest={insuranceRequest} />
    </div>
  );
}
