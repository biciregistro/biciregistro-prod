import Link from 'next/link';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Event } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProfileEventsProps {
  events: Event[];
}

export function ProfileEvents({ events }: ProfileEventsProps) {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize to start of today

  // Filter: published status AND date is today or in the future
  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    return e.status === 'published' && eventDate >= now;
  });

  // Sort: Nearest date first
  const sortedEvents = [...upcomingEvents].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  if (sortedEvents.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="bg-muted p-4 rounded-full">
            <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Sin eventos próximos</h3>
            <p className="text-muted-foreground max-w-xs">
              Vuelve pronto para descubrir las próximas actividades de esta organización.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold px-1">Próximos Eventos</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sortedEvents.map((event) => (
          <Link key={event.id} href={`/events/${event.id}`} className="group">
            <Card className="h-full overflow-hidden transition-all duration-300 group-hover:shadow-md group-hover:border-primary/50">
              <div className="aspect-video relative overflow-hidden bg-muted">
                {event.imageUrl ? (
                  <img 
                    src={event.imageUrl} 
                    alt={event.name} 
                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <Calendar className="h-10 w-10 text-primary/20" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                        {event.eventType}
                    </Badge>
                </div>
              </div>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base line-clamp-1">{event.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(event.date), "PPP", { locale: es })}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="line-clamp-1">{event.state}, {event.country}</span>
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-2 text-primary group-hover:bg-primary group-hover:text-white">
                  Ver Detalles
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
