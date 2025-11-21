'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Event } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Eye, Settings } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';

const statusStyles: { [key in Event['status']]: string } = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-700',
  published: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700',
};

export function EventCard({ event }: { event: Event }) {
  const eventImage = event.imageUrl || '/placeholder.svg'; // Provide a default placeholder
  const eventDate = new Date(event.date);

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg w-full flex flex-col">
      <CardHeader className="p-0">
        <AspectRatio ratio={16 / 9}>
          <Image
            src={eventImage}
            alt={event.name}
            fill
            className="object-cover"
          />
        </AspectRatio>
      </CardHeader>
      
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex-grow">
            <div className="flex justify-between items-start mb-2">
                <CardTitle className="text-xl leading-tight line-clamp-2">{event.name}</CardTitle>
                 <Badge className={cn("text-xs capitalize shrink-0 ml-2", statusStyles[event.status])}>
                    {event.status === 'draft' ? 'Borrador' : 'Publicado'}
                </Badge>
            </div>

            <div className="flex items-center text-sm text-muted-foreground mt-2">
                <Calendar className="mr-2 h-4 w-4" />
                <span>{eventDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
            <Link href={`/dashboard/ong/events/${event.id}/edit`}> 
              <Settings className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}
