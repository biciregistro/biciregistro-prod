import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getOngProfile } from '@/lib/data';
import { OngWizardClient } from './page-client';

export const metadata = {
  title: 'Configuración de Organizador | BiciRegistro',
  description: 'Completa tu perfil para publicar eventos.',
};

export default async function OngOnboardingPage() {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    redirect('/login');
  }

  // Double check role
  if (user.role !== 'ong') {
      redirect('/dashboard');
  }

  // If they already completed it normally, send them back to their dashboard
  if (user.onboardingCompleted) {
      redirect('/dashboard/ong');
  }

  // Fetch partial profile to restore session if they dropped off
  const initialData = await getOngProfile(user.id) || {};
  const step = (initialData as any).onboardingStep || 1;

  return (
    // FIX: Added px-4 to prevent titles from sticking to screen edges in mobile
    <div className="container py-8 max-w-3xl mx-auto px-4 md:px-6">
        <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Bienvenido a BiciRegistro</h1>
            <p className="text-muted-foreground text-sm md:text-base">Estás a un par de minutos de poder publicar tu primer evento. Configuremos el perfil de tu organización.</p>
        </div>
        <OngWizardClient 
            initialStep={step} 
            initialData={initialData} 
            userName={user.name} 
            userId={user.id}
        />
    </div>
  );
}
