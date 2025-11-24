import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/data';
import { EventForm } from '@/components/ong/event-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default async function CreateAdminEventPage() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
         <div className="mb-8">
          <Link href="/admin?tab=events">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Regresar a Gestión de Eventos
            </Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Crear Nuevo Evento</CardTitle>
            <CardDescription>
              Registra un nuevo evento oficial de la plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
