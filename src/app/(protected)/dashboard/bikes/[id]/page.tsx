import { getAuthenticatedUser, getBike } from '@/lib/data';
import { notFound, redirect } from 'next/navigation';
import BikeDetailsPageClient from './page-client';
import type { User, Bike } from '@/lib/types';

// The props object is destructured directly in the function signature
export default async function BikeDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  // Call getBike with both userId and bikeId for security and correctness
  const bike = await getBike(user.id, id);
  if (!bike) { // The getBike function will now handle the ownership check
    notFound();
  }

  return <BikeDetailsPageClient user={user} bike={bike} />;
}
