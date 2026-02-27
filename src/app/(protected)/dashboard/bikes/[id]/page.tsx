import { getAuthenticatedUser, getBike } from '@/lib/data';
import { notFound, redirect } from 'next/navigation';
import BikeDetailsPageClient from './page-client';
import type { User, Bike } from '@/lib/types';
import { getInsuranceRequestByBikeId } from '@/lib/actions/insurance-actions';

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

  return <BikeDetailsPageClient user={user} bike={bike} insuranceRequest={insuranceRequest} />;
}
