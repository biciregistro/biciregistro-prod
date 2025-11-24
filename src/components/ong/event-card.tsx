'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Event } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Eye, Settings } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';

const statusStyles: { [key: string]: string } = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-700',
  published: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700',
  finished: 'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-900/50 dark:text-zinc-400 dark:border-zinc-700',
};

interface EventCardProps {
    event: Event;
    basePath?: string;
}

export function EventCard({ event, basePath = '/dashboard/ong/events' }: EventCardProps) {
  const eventImage = event.imageUrl || '/placeholder.svg';
  
  const [displayDate, setDisplayDate] = useState<string>('');
  const [isFinished, setIsFinished] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const eventDate = new Date(event.date);
    const now = new Date();
    
    setIsFinished(eventDate < now);
    setDisplayDate(eventDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }));
    setIsClient(true);
  }, [event.date]);

  const displayStatus = isFinished ? 'finished' : event.status;
  const statusLabel = isFinished ? 'Finalizado' : (event.status === 'draft' ? 'Borrador' : 'Publicado');

  return (
    <Card className={cn("overflow-hidden transition-all hover:shadow-lg w-full flex flex-col group", isFinished && "opacity-75 hover:opacity-100")}>
      <CardHeader className="p-0">
        <Link href={`${basePath}/${event.id}`} className="block cursor-pointer">
            <AspectRatio ratio={16 / 9}>
            <Image
                src={eventImage}
                alt={event.name}
                fill
                className={cn("object-cover transition-transform group-hover:scale-105", isFinished && "grayscale-[50%]")}
            />
            </AspectRatio>
        </Link>
      </CardHeader>
      
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex-grow">
            <div className="flex justify-between items-start mb-2">
                <Link href={`${basePath}/${event.id}`} className="hover:underline decoration-primary">
                    <CardTitle className="text-xl leading-tight line-clamp-2">{event.name}</CardTitle>
                </Link>
                 {isClient ? (
                    <Badge className={cn("text-xs capitalize shrink-0 ml-2", statusStyles[displayStatus])}>
                        {statusLabel}
                    </Badge>
                 ) : (
                    <Badge className={cn("text-xs capitalize shrink-0 ml-2", statusStyles[event.status])}>
                        {event.status === 'draft' ? 'Borrador' : 'Publicado'}
                    </Badge>
                 )}
            </div>

            <div className="flex items-center text-sm text-muted-foreground mt-2">
                <Calendar className="mr-2 h-4 w-4" />
                <span>{displayDate || 'Cargando...'}</span> 
            </div>
        </div>

        <CardFooter className="p-0 pt-4 mt-4 border-t grid grid-cols-2 gap-3">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/events/${event.id}`} target="_blank" title="Ver página pública">
                <Eye className="mr-2 h-4 w-4" />
                Ver
            </Link>
          </Button>
          <Button asChild size="sm" className="w-full">
            <Link href={`${basePath}/${event.id}`}> 
              <Settings className="mr-2 h-4 w-4" />
              Gestionar
            </Link>
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}
