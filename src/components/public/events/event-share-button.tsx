'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { recordEventShareAction } from '@/lib/actions/gamification-actions';
import { triggerConfetti } from '@/lib/confetti';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EventShareButtonProps {
    event: {
        id: string;
        name: string;
        eventType: string;
        modality?: string;
        level?: string;
        date: string;
        state: string;
        distance?: number;
    };
    organizerName: string;
    isLoggedIn: boolean;
}

export function EventShareButton({ event, organizerName, isLoggedIn }: EventShareButtonProps) {
    const { toast } = useToast();
    const [isSharing, setIsSharing] = useState(false);

    const handleShare = async () => {
        setIsSharing(true);
        
        try {
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://biciregistro.mx';
            const eventUrl = `${baseUrl}/events/${event.id}`;
            
            // Fix Time Offset: Use parseISO to handle the ISO string from DB correctly
            // and format it explicitly to avoid native Date object timezone shifts.
            const eventDate = parseISO(event.date);
            const dateStr = format(eventDate, "EEEE d 'de' MMMM", { locale: es });
            const timeStr = format(eventDate, "HH:mm");
            
            const text = `¡Mira el evento que encontré! 🚴‍♂️🔥\n\nLo organiza ${organizerName}. Es una ${event.eventType} de ${event.modality || 'ciclismo'} para nivel ${event.level || 'libre'}, el próximo ${dateStr} a las ${timeStr} en ${event.state} y apenas son ${event.distance || 0} km.\n\nEste es el link para inscribirnos: ${eventUrl}\n\n¿Qué dices, vamos? 🙌`;

            let shareSuccess = false;

            if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
                try {
                    await navigator.share({
                        title: `Evento: ${event.name}`,
                        text: text,
                    });
                    shareSuccess = true;
                } catch (error: any) {
                    if (error.name !== 'AbortError') {
                         console.error("Error with Web Share API", error);
                    }
                }
            } else {
                try {
                    await navigator.clipboard.writeText(text);
                    toast({
                        title: "¡Invitación Copiada!",
                        description: "El mensaje ha sido copiado al portapapeles. Pégalo en tu publicación o mensaje.",
                        variant: "default"
                    });
                    shareSuccess = true;
                } catch (error) {
                    console.error("Failed to copy to clipboard", error);
                    toast({
                        title: "Error",
                        description: "No se pudo copiar el texto.",
                        variant: "destructive"
                    });
                }
            }

            if (shareSuccess && isLoggedIn) {
                setTimeout(async () => {
                    const result = await recordEventShareAction(event.id);
                    if (result && result.success && result.points) {
                        triggerConfetti();
                        toast({
                            title: "¡Recompensa Desbloqueada! 🎉",
                            description: `Has ganado ${result.points} KM por compartir este evento con la comunidad.`,
                            variant: "default",
                        });
                    }
                }, 1500);
            }

        } finally {
            setIsSharing(false);
        }
    };

    return (
        <Button 
            onClick={handleShare} 
            disabled={isSharing}
            variant="outline" 
            size="lg" 
            className="w-full sm:w-auto font-bold px-8 h-14 text-lg border-2 shadow-sm gap-2"
        >
            {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
            {isSharing ? 'Abriendo...' : 'Compartir Evento'}
        </Button>
    );
}
