import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/data';
import { RegisterWizard } from '@/components/dashboard/register-wizard';

export default async function RegisterBikePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container pt-2 pb-6 md:pt-4 md:pb-8">
      <div className="max-w-2xl mx-auto">
        <RegisterWizard />
      </div>
    </div>
  );
}
