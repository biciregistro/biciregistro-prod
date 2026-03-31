'use client';

import Link from 'next/link';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Calendar, ArrowRight, AlertCircle, ShieldCheck, Users } from 'lucide-react';
import { Event } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const eventDate = parseISO(event.date);
  
  // Lógica de "Últimos Lugares"
  const capacity = event.maxParticipants || 0;
  const registered = event.currentParticipants || 0;
  const occupancyRate = capacity > 0 ? registered / capacity : 0;
  const isHighDemand = occupancyRate >= 0.8 && capacity > 0;
  const isSoldOut = capacity > 0 && registered >= capacity;

  return (
    <Card className={cn(
        "flex flex-col h-full overflow-hidden transition-all duration-300 border-border/50 bg-background group rounded-2xl",
        isHighDemand && !isSoldOut ? "ring-1 ring-orange-200 shadow-orange-100" : "hover:shadow-xl hover:-translate-y-1"
    )}>
      {/* Imagen de Encabezado con Aspect Ratio Mobile-Friendly */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full bg-slate-100 text-slate-400">
            <ShieldCheck className="w-12 h-12 opacity-20" />
          </div>
        )}
        
        {/* Capa de Gradiente para legibilidad de Badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

        {/* Badges Flotantes Premium */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end z-10">
            <Badge className="bg-white/95 backdrop-blur-md text-primary font-bold border-none shadow-md py-1 px-3">
                {event.modality}
            </Badge>
            {isSoldOut ? (
                 <Badge variant="destructive" className="shadow-lg font-black uppercase tracking-tighter">
                    Cupo Agotado
                </Badge>
            ) : isHighDemand ? (
                <Badge className="bg-orange-500 text-white shadow-lg animate-pulse flex gap-1 items-center font-bold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    ¡Últimos lugares!
                </Badge>
            ) : null}
        </div>

        {/* Sello de Rodada Segura (Consistencia Marca) */}
        <div className="absolute bottom-3 left-3 z-10">
             <div className="bg-primary/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1 shadow-lg">
                <ShieldCheck className="w-3 h-3" /> Rodada Segura
             </div>
        </div>
      </div>

      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                {event.eventType}
            </span>
            {event.costType === 'Gratuito' && (
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Gratis</span>
            )}
        </div>
        <h3 className="font-extrabold text-xl md:text-2xl line-clamp-2 leading-[1.1] text-slate-900 group-hover:text-primary transition-colors duration-300">
          {event.name}
        </h3>
      </CardHeader>

      <CardContent className="px-5 py-3 flex-grow space-y-4">
        <div className="space-y-2.5">
            {/* Ubicación con Icono Activo */}
            <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                <div className="bg-primary/10 p-1.5 rounded-lg">
                    <MapPin className="w-4 h-4 text-primary" />
                </div>
                <span className="line-clamp-1">{event.state}, {event.country}</span>
            </div>

            {/* Fecha con Icono Activo */}
            <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                <div className="bg-primary/10 p-1.5 rounded-lg">
                    <Calendar className="w-4 h-4 text-primary" />
                </div>
                <span className="capitalize">
                    {format(eventDate, "EEEE d 'de' MMMM", { locale: es })}
                </span>
            </div>

            {/* Asistencia Real (Social Proof) */}
            {registered > 0 && (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 pt-1">
                    <Users className="w-3.5 h-3.5 text-primary/50" />
                    <span>{registered} ciclistas confirmados</span>
                </div>
            )}
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-2 mt-auto">
        <Button asChild className={cn(
            "w-full group/btn font-black uppercase tracking-widest text-xs h-12 shadow-md transition-all active:scale-95",
            isSoldOut ? "bg-slate-200 text-slate-500" : "bg-primary hover:bg-primary/90 text-white"
        )} size="lg" disabled={isSoldOut}>
          <Link href={`/events/${event.id}`} className="flex items-center justify-center">
            {isSoldOut ? 'Sin Lugares' : 'Ver detalles'}
            {!isSoldOut && <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
