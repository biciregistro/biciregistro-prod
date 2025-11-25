'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

interface EventStatusBadgeProps {
    status: 'draft' | 'published';
    date: string;
}

export function EventStatusBadge({ status, date }: EventStatusBadgeProps) {
    const [isFinished, setIsFinished] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [displayDate, setDisplayDate] = useState('');

    useEffect(() => {
        const eventDate = new Date(date);
        const now = new Date();
        setIsFinished(eventDate < now);
        setDisplayDate(eventDate.toLocaleDateString());
        setIsClient(true);
    }, [date]);

    if (!isClient) {
        // Server Fallback (prevents hydration mismatch/flicker using server assumption or default)
        const eventDate = new Date(date); 
        return (
            <>
                <Badge variant={status === 'published' ? 'default' : 'secondary'}>
                    {status === 'published' ? 'Publicado' : 'Borrador'}
                </Badge>
                <span className="text-muted-foreground text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {/* Render nothing or server date string, but be careful with locale. 
                        Safest is to render nothing or a static loader if locale is strict.
                        Using generic string here. */}
                    <span className="opacity-0">Cargando...</span>
                </span>
            </>
        );
    }

    return (
        <>
            {isFinished ? (
                <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400">
                    Finalizado
                </Badge>
            ) : (
                <Badge variant={status === 'published' ? 'default' : 'secondary'}>
                    {status === 'published' ? 'Publicado' : 'Borrador'}
                </Badge>
            )}
            <span className="text-muted-foreground text-sm flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {displayDate}
            </span>
        </>
    );
}
