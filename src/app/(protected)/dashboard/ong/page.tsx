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

  // For now, we'll use mock data. In the future, this will come from Firestore.
  // const events = await getEventsByOngId(user.id);
  const events = [
    { id: '1', ongId: user.id, name: 'Rodada Nocturna de Aniversario', date: '2024-08-15T19:00:00.000Z', imageUrl: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b', status: 'published' as const },
    { id: '2', ongId: user.id, name: 'Taller de Mecánica Básica', date: '2024-09-01T10:00:00.000Z', imageUrl: 'https://images.unsplash.com/photo-1621447289568-232128b9a1a3', status: 'published' as const },
    { id: '3', ongId: user.id, name: 'Gran Fondo - Reto Montaña', date: '2024-09-20T07:00:00.000Z', imageUrl: 'https://images.unsplash.com/photo-1598586959969-9e8a15b4928b', status: 'draft' as const },
  ];


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
