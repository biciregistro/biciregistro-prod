'use client';

import Link from 'next/link';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Calendar, ArrowRight, AlertCircle } from 'lucide-react';
import { Event } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

  return (
    <Card className="flex flex-col h-full overflow-hidden hover:shadow-lg transition-shadow duration-300 border-border/50 group">
      {/* Imagen de Encabezado */}
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full bg-slate-100 text-slate-400">
            <span className="text-sm">Sin imagen</span>
          </div>
        )}
        
        {/* Badges Flotantes */}
        <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-foreground shadow-sm">
                {event.modality}
            </Badge>
            {isHighDemand && (
                <Badge variant="destructive" className="shadow-sm animate-pulse flex gap-1 items-center">
                    <AlertCircle className="w-3 h-3" />
                    ¡Últimos lugares!
                </Badge>
            )}
        </div>
      </div>

      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex justify-between items-start gap-2">
            <Badge variant="outline" className="mb-2 text-xs font-normal text-muted-foreground border-slate-200">
                {event.eventType}
            </Badge>
            {event.costType === 'Gratuito' && (
                 <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Gratis</Badge>
            )}
        </div>
        <h3 className="font-bold text-xl line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {event.name}
        </h3>
      </CardHeader>

      <CardContent className="px-4 py-2 flex-grow space-y-3">
        {/* Ubicación */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary/70" />
          <span className="line-clamp-1">{event.state}, {event.country}</span>
        </div>

        {/* Fecha */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 flex-shrink-0 text-primary/70" />
          <span className="capitalize">
            {format(eventDate, "EEEE d 'de' MMMM", { locale: es })}
          </span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-2 mt-auto">
        <Button asChild className="w-full group/btn" size="default">
          <Link href={`/events/${event.id}`}>
            Ver detalles
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
