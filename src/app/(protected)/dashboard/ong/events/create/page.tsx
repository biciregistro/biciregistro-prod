import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getOngProfile } from '@/lib/data';
import { getFinancialSettings } from '@/lib/financial-data';
import { EventWizard } from '@/components/ong/event-wizard/event-wizard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { OngUser } from '@/lib/types';

export default async function CreateEventPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'ong') {
    redirect('/dashboard');
  }

  const [financialSettings, ongProfileData] = await Promise.all([
    getFinancialSettings(),
    getOngProfile(user.id)
  ]);

  const hasFinancialData = !!(ongProfileData?.financialData?.clabe);

  // Construct a partial OngUser object to pass to the form
  const ongProfile: Partial<OngUser> = {
      ...ongProfileData,
      id: user.id,
      email: user.email,
  };

  return (
    <div className="container py-8 px-4 md:px-6">
        <div className="max-w-4xl mx-auto mb-6">
            <Link href="/dashboard/ong?tab=events">
                <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Tablero
                </Button>
            </Link>
        </div>
        
      <div className="max-w-4xl mx-auto">
         <div className="mb-6">
             <h1 className="text-3xl font-bold tracking-tight">Crear Nuevo Evento</h1>
             <p className="text-muted-foreground">Sigue los pasos para publicar tu evento.</p>
         </div>

         <EventWizard 
            financialSettings={financialSettings} 
            hasFinancialData={hasFinancialData}
            ongProfile={ongProfile}
        />
      </div>
    </div>
  );
}
