'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Event } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Eye, Settings, Copy } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { useToast } from '@/hooks/use-toast';
import { cloneEvent } from '@/lib/actions/ong-actions';

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
  
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    const eventDate = new Date(event.date);
    const now = new Date();
    
    setIsFinished(eventDate < now);
    setDisplayDate(eventDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }));
    setIsClient(true);
  }, [event.date]);

  const handleClone = async () => {
    startTransition(async () => {
        const result = await cloneEvent(event.id);
        if (result.success && result.eventId) {
            toast({
                title: "Evento clonado",
                description: "Redirigiendo a la edición del nuevo evento...",
            });
            router.push(`/dashboard/ong/events/${result.eventId}/edit`);
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: result.message || "No se pudo clonar el evento.",
            });
        }
    });
  };

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

        <CardFooter className="p-0 pt-4 mt-4 border-t flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/events/${event.id}`} target="_blank" title="Ver página pública">
                <Eye className="mr-2 h-4 w-4" />
                Ver
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={handleClone} disabled={isPending} title="Duplicar evento">
              <Copy className="mr-2 h-4 w-4" />
              {isPending ? '...' : 'Clonar'}
          </Button>
          <Button asChild size="sm" className="flex-1">
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
