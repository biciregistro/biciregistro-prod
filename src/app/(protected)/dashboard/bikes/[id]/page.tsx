import { getAuthenticatedUser, getBikeById } from '@/lib/data';
import { notFound, redirect } from 'next/navigation';
import BikeDetailsPageClient from './page-client';
import type { User, Bike } from '@/lib/types';

export default async function BikeDetailsPage({ params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  const bike = await getBikeById(params.id);
  if (!bike || bike.userId !== user.id) {
    notFound();
  }

  return <BikeDetailsPageClient user={user} bike={bike} />;
}
