import { Suspense } from 'react';
import { Metadata } from 'next';
import { getPublicEvents, EventFilterParams } from '@/lib/actions/public-event-actions';
import { EventCard } from '@/components/public/events/event-card';
import { EventsFilterBar } from '@/components/public/events/events-filter-bar';
import { EventsGridSkeleton } from '@/components/public/events/events-grid-skeleton';
import { AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Eventos | BiciRegistro',
  description: 'Descubre los mejores eventos de ciclismo, competencias y rodadas cerca de ti.',
};

// Componente asíncrono que hace el fetch de datos
async function EventsList({ searchParams }: { searchParams: EventFilterParams }) {
  const { events, error } = await getPublicEvents(searchParams);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
        <AlertCircle className="w-10 h-10 mb-4 text-destructive/50" />
        <h3 className="text-lg font-semibold mb-2">Error al cargar eventos</h3>
        <p>Hubo un problema al conectar con el servidor. Intenta recargar la página.</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
        <div className="bg-muted rounded-full p-4 mb-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No se encontraron eventos</h3>
        <p className="max-w-md mx-auto">
          No hay eventos que coincidan con tus filtros actuales. Intenta ajustar la búsqueda o limpiar los filtros para ver más opciones.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

// CORRECCIÓN: Definir searchParams como Promise para compatibilidad con Next.js App Router recientes
export default async function EventsPage(props: {
  searchParams: Promise<EventFilterParams>;
}) {
  const searchParams = await props.searchParams;
  
  // Generar key única basada en filtros para forzar re-render de Suspense
  const suspenseKey = JSON.stringify(searchParams);

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="mb-8 space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-foreground">
          Próximos Eventos
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Explora competencias, rodadas recreativas y talleres. Inscríbete y asegura tu lugar en las mejores experiencias ciclistas.
        </p>
      </div>

      <EventsFilterBar />

      <Suspense key={suspenseKey} fallback={<EventsGridSkeleton />}>
        <EventsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
