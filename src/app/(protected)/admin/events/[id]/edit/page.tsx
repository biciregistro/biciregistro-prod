import { redirect, notFound } from 'next/navigation';
import { getAuthenticatedUser, getEvent, getOngProfile } from '@/lib/data';
import { getFinancialSettings } from '@/lib/financial-data';
import { EventForm } from '@/components/ong/event-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface EditAdminEventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAdminEventPage({ params }: EditAdminEventPageProps) {
  const { id } = await params;
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch data in parallel including financial settings
  const [event, financialSettings] = await Promise.all([
    getEvent(id),
    getFinancialSettings()
  ]);

  if (!event) {
    notFound();
  }

  // For admin, we assume they can manage financials or use global settings.
  // We pass hasFinancialData=true to allow full form functionality.
  // Alternatively, we could fetch admin's ONG profile if needed.
  const hasFinancialData = true;

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
         <div className="mb-8">
          <Link href="/admin?tab=events">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancelar Edición
            </Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Editar Evento: {event.name}</CardTitle>
            <CardDescription>
              Modifica los detalles del evento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventForm 
                initialData={event} 
                financialSettings={financialSettings} 
                hasFinancialData={hasFinancialData} 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
