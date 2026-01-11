import { redirect, notFound } from 'next/navigation';
import { getAuthenticatedUser, getEvent, getOngProfile } from '@/lib/data';
import { getFinancialSettings } from '@/lib/financial-data';
import { EventForm } from '@/components/ong/event-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'ong') {
    redirect('/dashboard');
  }

  // 1. Fetch Event first to handle 404s gracefully
  const event = await getEvent(id);

  if (!event) {
    console.error(`[EditEventPage] Event ${id} not found for user ${user.id}`);
    notFound();
  }

  if (event.ongId !== user.id) {
    redirect('/dashboard/ong');
  }

  // 2. Fetch other dependencies
  // We fetch these sequentially or in parallel AFTER validating the event exists
  // If getFinancialSettings fails, it should have fallback logic inside, but let's be safe.
  const [financialSettings, ongProfile] = await Promise.all([
    getFinancialSettings(),
    getOngProfile(user.id)
  ]);

  const hasFinancialData = !!(ongProfile?.financialData?.clabe);

  return (
    <div className="container py-8 px-4 md:px-6">
        <div className="max-w-4xl mx-auto mb-6">
            <Link href={`/dashboard/ong/events/${event.id}`}>
                <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Detalle
                </Button>
            </Link>
        </div>
        
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Editar Evento</CardTitle>
            <CardDescription>
              Actualiza la información de tu evento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventForm initialData={event} financialSettings={financialSettings} hasFinancialData={hasFinancialData} ongProfile={ongProfile || {}} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
