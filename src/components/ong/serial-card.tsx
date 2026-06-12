'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Serial, Event } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardFooter, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Eye, Settings, ExternalLink } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';

const statusStyles: { [key: string]: string } = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-700',
  published: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700',
  completed: 'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-900/50 dark:text-zinc-400 dark:border-zinc-700',
};

interface SerialCardProps {
    serial: Serial;
    stages: Event[];
}

export function SerialCard({ serial, stages }: SerialCardProps) {
  const serialImage = serial.heroImageUrl || '/placeholder.svg';
  const stageCount = stages.length;
  
  const displayStatus = serial.status || 'published';
  const statusLabel = displayStatus === 'completed' ? 'Finalizado' : (displayStatus === 'draft' ? 'Borrador' : 'Publicado');

  return (
    <Card className={cn("overflow-hidden transition-all hover:shadow-lg w-full flex flex-col group border-orange-200 shadow-sm", displayStatus === 'completed' && "opacity-75 hover:opacity-100")}>
      <CardHeader className="p-0 relative">
        <Link href={`/dashboard/ong/serials/${serial.id}`} className="block cursor-pointer">
            <AspectRatio ratio={16 / 9}>
            <Image
                src={serialImage}
                alt={serial.name}
                fill
                className={cn("object-cover transition-transform group-hover:scale-105", displayStatus === 'completed' && "grayscale-[50%]")}
            />
            <div className="absolute top-2 left-2 flex gap-2">
                <Badge className="bg-orange-600 text-white font-bold shadow-sm hover:bg-orange-700">
                    <Trophy className="w-3 h-3 mr-1" />
                    Campeonato
                </Badge>
            </div>
            </AspectRatio>
        </Link>
      </CardHeader>
      
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex-grow">
            <div className="flex justify-between items-start mb-2">
                <Link href={`/dashboard/ong/serials/${serial.id}`} className="hover:underline decoration-orange-600">
                    <CardTitle className="text-xl leading-tight line-clamp-2">{serial.name}</CardTitle>
                </Link>
                <Badge className={cn("text-xs capitalize shrink-0 ml-2", statusStyles[displayStatus])}>
                    {statusLabel}
                </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                <div className="flex items-center">
                    <Calendar className="mr-1.5 h-4 w-4 text-orange-600/70" />
                    <span className="font-medium text-foreground">{stageCount} Etapas</span> 
                </div>
            </div>
            
            {stages.length > 0 && (
                <div className="mt-3 flex gap-1 flex-wrap">
                    {stages.slice(0, 4).map((stage, i) => (
                        <div key={stage.id} className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground" title={stage.name}>
                            E{i+1}
                        </div>
                    ))}
                    {stages.length > 4 && (
                        <div className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">
                            +{stages.length - 4}
                        </div>
                    )}
                </div>
            )}
        </div>

        <CardFooter className="p-0 pt-4 mt-4 border-t flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/serial/${serial.slug}`} target="_blank" title="Ver página pública">
                <ExternalLink className="mr-2 h-4 w-4" />
                Landing
            </Link>
          </Button>
          <Button asChild size="sm" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
            <Link href={`/dashboard/ong/serials/${serial.id}`}> 
              <Settings className="mr-2 h-4 w-4" />
              Gestionar Serial
            </Link>
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}
