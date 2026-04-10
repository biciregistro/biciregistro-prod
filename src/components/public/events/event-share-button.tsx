'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { recordEventShareAction } from '@/lib/actions/gamification-actions';
import { triggerConfetti } from '@/lib/confetti';

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
            
            const eventDate = new Date(event.date);
            const dateStr = eventDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
            const timeStr = eventDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            
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
                    // Si el usuario canceló el share, no queremos mostrar error ni dar puntos.
                    if (error.name !== 'AbortError') {
                         console.error("Error with Web Share API", error);
                    }
                }
            } else {
                // Fallback para Desktop o navegadores sin soporte
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

            // Lógica de Gamificación si el share fue exitoso y el usuario está logueado
            if (shareSuccess && isLoggedIn) {
                // Retraso artificial para que se sienta fluido tras volver de la app nativa
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
                }, 1500); // 1.5 segundos de retraso
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
