import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getEventsByOngId } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { EventCard } from '@/components/ong/event-card';

export default async function OngDashboardPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'ong') {
    redirect('/dashboard');
  }

  const events = await getEventsByOngId(user.id);

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Eventos</h1>
          <p className="text-muted-foreground">Crea y administra los eventos de tu comunidad.</p>
        </div>
        <Link href="/dashboard/ong/events/create">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Nuevo Evento
          </Button>
        </Link>
      </div>

      {events.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
             <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-dashed border-2 rounded-lg">
          <h2 className="text-xl font-semibold">Aún no has creado ningún evento.</h2>
          <p className="text-muted-foreground mt-2">
            ¡Comienza a planificar tu próxima rodada, taller o competencia!
          </p>
          <Link href="/dashboard/ong/events/create" className="mt-6 inline-block">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear mi Primer Evento
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
