import { getAuthenticatedUser, getBike } from '@/lib/data';
import { notFound, redirect } from 'next/navigation';
import BikeDetailsPageClient from './page-client';
import type { User, Bike } from '@/lib/types';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function BikeDetailsPage(props: PageProps) {
  const { id } = props.params;
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  const bike = await getBike(id);
  if (!bike || bike.userId !== user.id) {
    notFound();
  }

  return <BikeDetailsPageClient user={user} bike={bike} />;
}
