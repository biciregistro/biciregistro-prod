import { redirect, notFound } from 'next/navigation';
import { getAuthenticatedUser, getEvent } from '@/lib/data';
import { getFinancialSettings } from '@/lib/financial-data';
import { EventForm } from '@/components/ong/event-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'ong') {
    redirect('/dashboard');
  }

  // Fetch data in parallel
  const [event, financialSettings] = await Promise.all([
    getEvent(params.id),
    getFinancialSettings()
  ]);

  if (!event) {
    notFound();
  }

  if (event.ongId !== user.id) {
    // Prevent editing events that don't belong to the organization
    redirect('/dashboard/ong');
  }

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
            <EventForm initialData={event} financialSettings={financialSettings} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
