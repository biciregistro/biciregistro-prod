import { OngDashboardHero } from '@/components/ong/ong-dashboard-hero';
import { getAuthenticatedUser, getOngProfile } from '@/lib/data';
import { redirect } from 'next/navigation';
import { SerialWizard } from '@/components/ong/serial-wizard/serial-wizard';
import type { OngUser } from '@/lib/types';

export const metadata = {
  title: 'Crear Campeonato | Dashboard B2B | BiciRegistro',
};

export default async function CreateSerialPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'ong') {
    redirect('/login');
  }

  const ongProfile = await getOngProfile(user.id);
  if (!ongProfile) {
    redirect('/dashboard');
  }

  // Cast para ignorar campos como 'email' o 'role' que no espera OngDashboardHeroProps si la interfaz diverge ligeramente en UI vs Server
  const safeProfile = ongProfile as unknown as OngUser;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <OngDashboardHero ongProfile={safeProfile} />
      <div className="bg-card rounded-xl border shadow-sm p-6 md:p-8">
        <h1 className="text-2xl font-bold mb-6">Creación de Campeonato (Serial)</h1>
        <p className="text-muted-foreground mb-8">
          Configura un nuevo campeonato. Define las reglas globales, fechas de las etapas y el ecosistema de competencia. 
          Los corredores mantendrán su mismo número de placa en todas las fechas.
        </p>
        
        <SerialWizard />
      </div>
    </div>
  );
}
