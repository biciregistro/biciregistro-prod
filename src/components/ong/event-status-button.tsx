'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { toggleEventStatusAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Play, Pause, Loader2 } from 'lucide-react';

interface EventStatusButtonProps {
    eventId: string;
    currentStatus: 'draft' | 'published';
}

export function EventStatusButton({ eventId, currentStatus }: EventStatusButtonProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const isPublished = currentStatus === 'published';
    const newStatus = isPublished ? 'draft' : 'published';
    const buttonText = isPublished ? 'Pausar Evento' : 'Publicar Evento';
    const successMessage = isPublished ? 'Evento pausado (borrador).' : '¡Evento publicado!';

    const handleClick = () => {
        startTransition(async () => {
            const result = await toggleEventStatusAction(eventId, newStatus);
            
            if (result.success) {
                toast({
                    title: successMessage,
                    description: isPublished 
                        ? "El evento ya no es visible públicamente." 
                        : "El evento ahora es visible para todos.",
                });
                router.refresh();
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error || "No se pudo actualizar el estado.",
                });
            }
        });
    };

    return (
        <Button 
            variant={isPublished ? "secondary" : "default"} 
            onClick={handleClick} 
            disabled={isPending}
            className="flex-1 md:flex-none"
        >
            {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isPublished ? (
                <Pause className="mr-2 h-4 w-4" />
            ) : (
                <Play className="mr-2 h-4 w-4" />
            )}
            {buttonText}
        </Button>
    );
}
