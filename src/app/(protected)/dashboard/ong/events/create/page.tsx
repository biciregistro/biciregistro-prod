import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getOngProfile } from '@/lib/data';
import { getFinancialSettings } from '@/lib/financial-data';
import { EventForm } from '@/components/ong/event-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
            <Link href="/dashboard/ong">
                <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Tablero
                </Button>
            </Link>
        </div>
        
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Crear Nuevo Evento</CardTitle>
            <CardDescription>
              Completa la información para publicar un nuevo evento para tu comunidad.
              Los campos marcados con * son obligatorios para publicar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventForm 
                financialSettings={financialSettings} 
                hasFinancialData={hasFinancialData}
                ongProfile={ongProfile} // Nuevo prop
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
