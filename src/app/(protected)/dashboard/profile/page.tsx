import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/data';
import { ProfileForm } from '@/components/user-components';

export default async function ProfilePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container py-6 md:py-8">
      <div className="max-w-2xl mx-auto">
        <ProfileForm user={user} />
      </div>
    </div>
  );
}
