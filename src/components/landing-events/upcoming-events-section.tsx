import Link from 'next/link';
import { ArrowRight, PlusCircle } from 'lucide-react';
import { getPublicEvents } from '@/lib/actions/public-event-actions';
import { EventCard } from '@/components/public/events/event-card';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

export async function UpcomingEventsSection() {
  const { events, error } = await getPublicEvents({});

  if (error || !events || events.length === 0) {
    return null;
  }

  // Tomamos solo los primeros 6 para el carrusel del home
  const displayEvents = events.slice(0, 6);

  return (
    <section className="py-16 bg-slate-50/50">
      <div className="container px-4 mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-8 gap-4 text-center md:text-left">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Próximos eventos
            </h2>
            <p className="text-muted-foreground text-lg">
              Descubre y participa en las mejores rodadas y competencias.
            </p>
          </div>
          <Button asChild variant="default" className="hidden md:flex group bg-blue-600 hover:bg-blue-700 text-white border-none">
            <Link href="/events">
              Ver todos los eventos
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        <div className="relative px-4 md:px-12">
          <Carousel
            opts={{
              align: 'start',
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {displayEvents.map((event) => (
                <CarouselItem
                  key={event.id}
                  className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3"
                >
                  <div className="h-full pb-4">
                    <EventCard event={event} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="hidden md:block">
              <CarouselPrevious className="-left-4 lg:-left-12" />
              <CarouselNext className="-right-4 lg:-right-12" />
            </div>
          </Carousel>
        </div>

        <div className="mt-4 md:hidden text-center px-4">
             <Button asChild variant="default" className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                <Link href="/events">Ver todos los eventos</Link>
            </Button>
        </div>

        <div className="mt-16 p-8 rounded-2xl bg-white border border-border shadow-sm text-center space-y-6 max-w-3xl mx-auto">
          <div className="space-y-2">
            <h3 className="text-xl font-bold">¿Organizas eventos para ciclistas?</h3>
            <p className="text-muted-foreground">
              El tuyo no puede faltar aquí. Publica, gestiona inscripciones y llega a más ciclistas.
            </p>
          </div>
          <Button asChild size="lg" className="rounded-full shadow-md hover:shadow-lg transition-all group">
            <Link href="/events-manager">
              <PlusCircle className="mr-2 h-5 w-5" />
              Publicar mi evento gratis
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
