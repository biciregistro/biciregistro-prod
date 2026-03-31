'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, PlusCircle, Sparkles } from 'lucide-react';
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
import { Event } from '@/lib/types';

export function UpcomingEventsSection() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
        try {
            const { events: fetchedEvents } = await getPublicEvents({});
            if (fetchedEvents) setEvents(fetchedEvents.slice(0, 8));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }
    loadEvents();
  }, []);

  if (loading || events.length === 0) {
    return null;
  }

  return (
    <section className="py-20 md:py-28 bg-white relative overflow-hidden border-y border-border/50">
        {/* Patrón de fondo sutil sobre fondo blanco */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="grid-events" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-events)" />
            </svg>
        </div>

      <div className="container px-4 mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-12 gap-6 text-center md:text-left">
          <div className="space-y-3">
            <div className="flex items-center justify-center md:justify-start gap-2 text-primary font-black uppercase tracking-[0.2em] text-[11px]">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Eventos activos en México
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900">
              La red ciclista en movimiento
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl max-w-xl leading-relaxed">
              Descubre y participa en las mejores rodadas, competencias y talleres cerca de ti.
            </p>
          </div>
          
          <Button asChild size="lg" className="hidden md:flex group bg-primary hover:bg-primary/90 text-primary-foreground border-none rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
            <Link href="/events">
              Explorar cartelera completa
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        {/* Carrusel con Peek-a-boo Effect para Mobile */}
        <div className="relative -mx-4 px-4 md:px-0">
          <Carousel
            opts={{
              align: 'start',
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {events.map((event) => (
                <CarouselItem
                  key={event.id}
                  className="pl-4 basis-[85%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <div className="h-full pb-8">
                    <EventCard event={event} />
                  </div>
                </CarouselItem>
              ))}
              
              {/* Card de CTA para Organizadores al final del carrusel */}
              <CarouselItem className="pl-4 basis-[85%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                 <div className="h-[calc(100%-32px)] bg-slate-950 rounded-2xl p-6 md:p-8 flex flex-col justify-center text-center space-y-6 shadow-2xl relative overflow-hidden border border-white/10 group min-h-[400px]">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Sparkles className="w-24 h-24 text-primary" />
                    </div>
                    <div className="space-y-4 relative z-10">
                        <div className="bg-primary/20 w-14 h-14 rounded-full flex items-center justify-center mx-auto border border-primary/30">
                            <PlusCircle className="w-7 h-7 text-primary" />
                        </div>
                        <h3 className="text-xl font-extrabold text-white leading-tight">¿Organizas eventos ciclistas?</h3>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-[240px] mx-auto">
                            Llega a miles de ciclistas y gestiona tus inscripciones con tecnología BiciRegistro.
                        </p>
                    </div>
                    <Button asChild variant="secondary" className="w-full font-black uppercase tracking-widest text-[10px] h-11 relative z-10 transition-transform hover:scale-105 active:scale-95">
                        <Link href="/events-manager">
                            Publicar gratis
                        </Link>
                    </Button>
                 </div>
              </CarouselItem>
            </CarouselContent>
            <div className="hidden md:block">
              <CarouselPrevious className="bg-white shadow-xl border-none hover:bg-slate-50 -left-6 lg:-left-12 h-12 w-12" />
              <CarouselNext className="bg-white shadow-xl border-none hover:bg-slate-50 -right-6 lg:-right-12 h-12 w-12" />
            </div>
          </Carousel>
        </div>

        <div className="mt-2 md:hidden text-center">
             <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full rounded-xl font-bold h-14 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">
                <Link href="/events" className="flex items-center justify-center gap-2">
                    Ver todos los eventos
                    <ArrowRight className="w-5 h-5" />
                </Link>
            </Button>
        </div>

        {/* Separador sutil */}
        <div className="mt-20 border-t border-border/50 max-w-sm mx-auto opacity-50 md:hidden"></div>
      </div>
    </section>
  );
}
