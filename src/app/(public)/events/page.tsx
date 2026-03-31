import { Suspense } from 'react';
import { Metadata } from 'next';
import { getPublicEvents, EventFilterParams } from '@/lib/actions/public-event-actions';
import { EventCard } from '@/components/public/events/event-card';
import { EventsFilterBar } from '@/components/public/events/events-filter-bar';
import { AlertCircle, Sparkles, Trophy, Bike, MapPin, Calendar, ArrowRight, PlusCircle, Loader2, GraduationCap, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format, parseISO, addDays, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { getHomepageData } from '@/lib/data';
import { SponsorsCarousel } from '@/components/shared/sponsors-carousel';
import { MobileQuickFilters } from '@/components/public/events/mobile-quick-filters';

export const metadata: Metadata = {
  title: 'Eventos | BiciRegistro',
  description: 'Descubre los mejores eventos de ciclismo, competencias y rodadas cerca de ti.',
};

interface EventRowProps {
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    events: any[];
    className?: string;
    alwaysShow?: boolean;
}

function EventRow({ title, subtitle, icon, events, className, alwaysShow }: EventRowProps) {
    if (events.length === 0 && !alwaysShow) return null;
    
    return (
        <div className={cn("space-y-4 py-6 border-b border-white/5 last:border-0", className)}>
            <div className="flex items-end justify-between px-6 md:px-0">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 text-primary font-black uppercase tracking-tighter text-2xl md:text-4xl lg:text-5xl">
                        {icon && <div className="p-2 bg-primary/10 rounded-xl">{icon}</div>}
                        {title}
                    </div>
                    {subtitle && <p className="text-slate-400 text-sm md:text-lg font-bold tracking-tight ml-1">{subtitle}</p>}
                </div>
            </div>
            
            <div className="relative">
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 no-scrollbar md:px-0">
                    
                    {events.map((event, index) => (
                        <div key={event.id} className={cn(
                            "min-w-[300px] md:min-w-[380px] snap-start h-full",
                            index === 0 ? "ml-6 md:ml-0" : ""
                        )}>
                            <EventCard event={event} />
                        </div>
                    ))}
                    
                    <div className={cn(
                        "min-w-[300px] md:min-w-[380px] snap-start h-full mr-6 md:mr-0",
                        events.length === 0 ? "ml-6 md:ml-0" : ""
                    )}>
                        <div className="h-full bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col justify-center text-center space-y-6 relative overflow-hidden group min-h-[420px]">
                            <div className="bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-primary/30 group-hover:scale-110 transition-transform">
                                <PlusCircle className="w-8 h-8 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-white leading-tight">¿Falta tu evento?</h3>
                                <p className="text-slate-400 text-sm font-medium">Súmalo a la red más grande de México hoy mismo.</p>
                            </div>
                            <Button asChild variant="outline" className="border-primary/50 text-primary hover:bg-primary hover:text-white font-bold h-12 uppercase tracking-widest text-[10px]">
                                <Link href="/events-manager">Publicar Gratis</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeaturedEvent({ event }: { event: any }) {
    if (!event) return null;
    const eventDate = parseISO(event.date);

    return (
        <div className="relative w-full h-[85vh] md:h-[90vh] overflow-hidden group flex flex-col justify-end">
            {event.imageUrl ? (
                <Image 
                    src={event.imageUrl} 
                    alt={event.name} 
                    fill 
                    className="object-cover transition-transform duration-[3000ms] group-hover:scale-110" 
                    priority
                />
            ) : (
                <div className="absolute inset-0 bg-slate-900" />
            )}
            
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950 z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 via-slate-950/20 to-transparent z-10" />
            
            <div className="relative z-20 w-full container mx-auto px-6 pb-12 md:pb-24 space-y-6 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl animate-pulse mx-auto md:mx-0">
                    <Sparkles className="w-4 h-4 fill-current" />
                    Evento Destacado
                </div>
                
                <div className="space-y-4 max-w-4xl mx-auto md:mx-0">
                    <h1 className="text-4xl md:text-7xl lg:text-9xl font-black text-white leading-[0.85] tracking-tighter uppercase drop-shadow-2xl">
                        {event.name}
                    </h1>
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-white text-base md:text-xl font-bold tracking-tight opacity-90">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            <span className="capitalize">{format(eventDate, "EEEE d 'de' MMMM", { locale: es })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            <span>{event.state}, {event.country}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6 max-w-xs mx-auto md:mx-0 md:max-w-none">
                    <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest px-10 h-16 text-lg shadow-2xl shadow-primary/40 active:scale-95 transition-all w-full md:w-auto">
                        <Link href={`/events/${event.id}`}>Inscribirme</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="bg-white/5 backdrop-blur-xl border-white/20 text-white hover:bg-white/20 font-black uppercase tracking-widest px-10 h-16 text-sm w-full md:w-auto">
                        <Link href={`/events/${event.id}`}>Ver Detalles</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

async function EventsLayoutMode({ searchParams, allies }: { searchParams: EventFilterParams, allies: any[] }) {
  const hasActiveFilters = !!(searchParams.search || searchParams.eventType || searchParams.modality || searchParams.state || searchParams.startDate);
  
  // 1. Obtener eventos con los filtros actuales
  let { events, error } = await getPublicEvents(searchParams);
  let showNoResultsWarning = false;

  // 2. Si hay filtros pero NO hay resultados, obtenemos TODOS los eventos
  // y activamos el flag de la leyenda (Refinamiento: Cero pantallas vacías)
  if (hasActiveFilters && (!events || events.length === 0)) {
      const fallbackData = await getPublicEvents({});
      events = fallbackData.events;
      showNoResultsWarning = true;
  }

  // Manejo de error crítico (no hay eventos ni siquiera sin filtros)
  if (error || (!events || events.length === 0)) {
     return (
        <div className="container mx-auto px-4 py-12">
            <div className="flex flex-col items-center justify-center p-16 text-center text-slate-400 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                <AlertCircle className="w-12 h-12 mb-4 text-primary/50" />
                <h3 className="text-2xl font-black text-white mb-2 uppercase">Cartelera Vacía</h3>
                <p className="max-w-md mx-auto mb-8 font-medium">
                    Actualmente no hay eventos programados en la plataforma.
                </p>
                <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <Link href="/events-manager">Ser el primero en publicar</Link>
                </Button>
            </div>
        </div>
     );
  }

  // 3. Vista de Resultados de Búsqueda Exitosos (Grid)
  if (hasActiveFilters && !showNoResultsWarning) {
      return (
        <div className="flex flex-col min-h-[100vh]">
            <div className="flex flex-col h-[100vh]">
                <FeaturedEvent event={events[0]} />
                <SponsorsCarousel 
                    sponsors={allies} 
                    className="bg-white py-6 border-y border-slate-100 shadow-inner shrink-0" 
                />
            </div>

            <div className="container mx-auto px-6 py-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="max-w-4xl mx-auto mb-8 md:px-0 sticky top-4 z-40">
                    <div className="backdrop-blur-md bg-slate-950/60 p-4 rounded-2xl border border-white/5 shadow-2xl">
                        <div className="md:hidden">
                            <MobileQuickFilters />
                        </div>
                        <div className="hidden md:block">
                            <EventsFilterBar />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-slate-500 mb-6 font-black text-xs uppercase tracking-[0.3em]">
                    <div className="h-px flex-1 bg-white/10"></div>
                    <span>Resultados Encontrados ({events.length})</span>
                    <div className="h-px flex-1 bg-white/10"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {events.map((event) => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            </div>
        </div>
      );
  }

  // 4. Vista General (Carriles) - Se muestra si no hay filtros, o si los filtros fallaron (showNoResultsWarning === true)
  const now = startOfDay(new Date());
  const weekFromNow = addDays(now, 7);
  
  const featured = events[0];
  const upcomingWeek = events.filter(e => {
      const d = parseISO(e.date);
      return isBefore(d, weekFromNow);
  });
  const raceEvents = events.filter(e => e.eventType === 'Competencia');
  const roadEvents = events.filter(e => e.modality === 'Ruta' || e.modality === 'Gravel');
  const workshopEvents = events.filter(e => e.eventType === 'Taller' || e.eventType === 'Conferencia');

  return (
    <div className="flex flex-col min-h-[100vh] animate-in fade-in duration-[1500ms]">
        <div className="flex flex-col h-[100vh]">
            <FeaturedEvent event={featured} />
            <SponsorsCarousel 
                sponsors={allies} 
                className="bg-white py-6 border-y border-slate-100 shadow-inner shrink-0" 
            />
        </div>

        <div className="container mx-auto px-0 md:px-4 pt-8">
            <div className="max-w-4xl mx-auto px-6 md:px-0 sticky top-4 z-40">
                <div className="backdrop-blur-md bg-slate-950/60 p-4 rounded-2xl border border-white/5 shadow-2xl">
                    <div className="md:hidden">
                        <MobileQuickFilters />
                    </div>
                    <div className="hidden md:block">
                        <EventsFilterBar />
                    </div>
                </div>
                
                {/* LEYENDA: El filtro no dio resultados, mostramos esto y los carriles debajo continúan su curso normal */}
                <div className={cn(
                    "mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 border border-white/10 rounded-xl transition-all duration-500 overflow-hidden",
                    showNoResultsWarning ? "opacity-100 max-h-20" : "opacity-0 max-h-0 py-0 border-none"
                )}>
                    <Info className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="text-[10px] md:text-xs font-bold text-slate-300 uppercase tracking-widest text-center">
                        Por el momento no tenemos eventos relacionados.
                    </span>
                </div>
            </div>
            
            <div className="space-y-2 md:px-0 mt-8">
                <EventRow 
                    title="Próximos 7 días" 
                    subtitle="¡Aún estás a tiempo! Rodadas esta semana"
                    icon={<Sparkles className="w-4 h-4 text-yellow-400" />}
                    events={upcomingWeek}
                />

                <EventRow 
                    title="Rodadas Recreativas" 
                    subtitle="Descubre nuevas rutas con la comunidad"
                    icon={<Bike className="w-4 h-4 text-primary" />}
                    events={events.filter(e => e.eventType === 'Rodada')}
                />

                <EventRow 
                    title="Competencias" 
                    subtitle="Mide tu potencial contra los mejores"
                    icon={<Trophy className="w-4 h-4 text-orange-500" />}
                    events={raceEvents}
                />

                <EventRow 
                    title="Conferencias / Talleres" 
                    subtitle="Aprende, conecta y profesionaliza tu pasión"
                    icon={<GraduationCap className="w-4 h-4 text-blue-400" />}
                    events={workshopEvents}
                    alwaysShow={true}
                />

                <EventRow 
                    title="Ruta & Velocidad" 
                    subtitle="Velocidad y resistencia en el asfalto"
                    icon={<Bike className="w-4 h-4 text-sky-400" />}
                    events={roadEvents}
                />

                <div className="mt-20 px-6 pb-20">
                    <div className="max-w-5xl mx-auto relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900 shadow-2xl shadow-black/50 group">
                        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] transition-opacity group-hover:opacity-100 opacity-50" />
                        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[80px]" />
                        
                        <div className="relative z-10 px-8 py-16 md:py-24 text-center space-y-8">
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-primary text-[11px] font-black uppercase tracking-widest border border-primary/30 mx-auto animate-pulse">
                                    <Trophy className="w-3 h-3" /> Comunidad BiciRegistro
                                </div>
                                <h3 className="text-4xl md:text-7xl lg:text-8xl font-black text-white uppercase leading-[0.85] tracking-tighter drop-shadow-lg">
                                    ¿Llevas el control <br className="hidden md:block"/> de tu comunidad?
                                </h3>
                                <p className="text-slate-400 text-base md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                                    Aumenta la visibilidad de tus eventos y gestiona inscripciones de manera profesional. Nuestra plataforma te permite conectar con miles de ciclistas, automatizar pagos y garantizar la seguridad de cada participante con tecnología de vanguardia.
                                </p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] px-12 h-16 text-lg rounded-full shadow-2xl shadow-primary/40 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto">
                                    <Link href="/events-manager">Comenzar gratis</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}

export default async function EventsPage(props: {
  searchParams: Promise<EventFilterParams>;
}) {
  const searchParams = await props.searchParams;
  const suspenseKey = JSON.stringify(searchParams);
  
  const homepageData = await getHomepageData();
  const allies = (homepageData['allies'] as any)?.sponsors || [];

  return (
    <div className="bg-slate-950 min-h-screen text-slate-50 selection:bg-primary selection:text-white overflow-x-hidden">
        <Suspense key={suspenseKey} fallback={<div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-white"><Loader2 className="w-12 h-12 text-primary animate-spin" /><p className="font-bold uppercase tracking-widest text-[10px] opacity-40">Sincronizando Cartelera...</p></div>}>
            <EventsLayoutMode searchParams={searchParams} allies={allies} />
        </Suspense>
    </div>
  );
}
