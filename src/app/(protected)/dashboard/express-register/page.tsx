import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/data';
import { ExpressRegisterForm } from '@/components/dashboard/express-register-form';

export default async function ExpressRegisterPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container pt-4 pb-12 max-w-2xl mx-auto">
        <ExpressRegisterForm />
    </div>
  );
}
