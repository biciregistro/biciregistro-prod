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
  
  const capacity = event.maxParticipants || 0;
  const registered = event.currentParticipants || 0;
  const occupancyRate = capacity > 0 ? registered / capacity : 0;
  const isHighDemand = occupancyRate >= 0.8 && capacity > 0;
  const isSoldOut = capacity > 0 && registered >= capacity;

  return (
    <Card className={cn(
        "flex flex-col h-full overflow-hidden transition-all duration-500 bg-slate-900 border-white/5 hover:border-white/10 group rounded-2xl shadow-2xl",
        isHighDemand && !isSoldOut ? "ring-1 ring-orange-500/50 shadow-orange-900/20" : "hover:-translate-y-2 hover:shadow-primary/10"
    )}>
      {/* Imagen de Encabezado con relación de aspecto fija y altura consistente */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-800 shrink-0">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full bg-slate-800 text-slate-600">
            <ShieldCheck className="w-12 h-12 opacity-10" />
          </div>
        )}
        
        {/* Capa de Gradiente Teatral */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

        {/* Badges Flotantes Premium */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end z-10">
            <Badge className="bg-primary/90 backdrop-blur-md text-white font-black uppercase tracking-widest text-[9px] border-none shadow-xl py-1.5 px-3">
                {event.modality}
            </Badge>
            {isSoldOut ? (
                 <Badge variant="destructive" className="shadow-lg font-black uppercase tracking-tighter text-[10px]">
                    Agotado
                </Badge>
            ) : isHighDemand ? (
                <Badge className="bg-orange-500 text-white shadow-lg animate-pulse flex gap-1 items-center font-bold text-[9px] uppercase tracking-wider">
                    <AlertCircle className="w-3 h-3" />
                    Últimos lugares
                </Badge>
            ) : null}
        </div>

        {/* Sello de Rodada Segura */}
        <div className="absolute bottom-3 left-3 z-10">
             <div className="bg-slate-900/80 backdrop-blur-sm text-primary text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border border-primary/20 flex items-center gap-1.5 shadow-2xl">
                <ShieldCheck className="w-3.5 h-3.5" /> Rodada Segura
             </div>
        </div>
      </div>

      <CardHeader className="pb-2 pt-6 px-6 shrink-0">
        <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                {event.eventType}
            </span>
            {event.costType === 'Gratuito' && (
                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md border border-emerald-400/20">Gratis</span>
            )}
        </div>
        <h3 className="font-extrabold text-xl md:text-2xl line-clamp-2 h-[2.2em] leading-[1.1] text-white group-hover:text-primary transition-colors duration-300">
          {event.name}
        </h3>
      </CardHeader>

      <CardContent className="px-6 py-3 flex-grow space-y-4">
        <div className="space-y-3">
            {/* Ubicación */}
            <div className="flex items-center gap-3 text-sm font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
                <div className="bg-white/5 p-2 rounded-xl group-hover:bg-primary/10 transition-colors">
                    <MapPin className="w-4 h-4 text-primary" />
                </div>
                <span className="line-clamp-1 tracking-tight">{event.state}, {event.country}</span>
            </div>

            {/* Fecha */}
            <div className="flex items-center gap-3 text-sm font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
                <div className="bg-white/5 p-2 rounded-xl group-hover:bg-primary/10 transition-colors">
                    <Calendar className="w-4 h-4 text-primary" />
                </div>
                <span className="capitalize tracking-tight line-clamp-1">
                    {format(eventDate, "EEEE d 'de' MMMM", { locale: es })}
                </span>
            </div>

            {/* Asistencia */}
            {registered > 0 && (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pt-1">
                    <Users className="w-4 h-4 text-primary/40" />
                    <span>{registered} Confirmados</span>
                </div>
            )}
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-2 mt-auto shrink-0">
        <Button asChild className={cn(
            "w-full group/btn font-black uppercase tracking-[0.2em] text-[10px] h-14 shadow-2xl transition-all active:scale-95",
            isSoldOut ? "bg-slate-800 text-slate-500" : "bg-primary hover:bg-primary/90 text-white"
        )} size="lg" disabled={isSoldOut}>
          <Link href={`/events/${event.id}`} className="flex items-center justify-center">
            {isSoldOut ? 'Sin Lugares' : 'Ver detalles'}
            {!isSoldOut && <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover/btn:translate-x-1" />}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
