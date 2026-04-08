import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/data';
import { OngOnboardingClient } from './page-client';

export const metadata = {
  title: 'Registra tu Bicicleta | BiciRegistro',
  description: 'Completa el registro rápido de tu bicicleta.',
};

export default async function OngOnboardingPage() {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container py-8 max-w-2xl mx-auto">
        <OngOnboardingClient />
    </div>
  );
}
