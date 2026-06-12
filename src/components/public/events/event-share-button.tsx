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
            
            // Fix Time Offset: Utilizamos la internacionalización de JS con timeZone: 'UTC'
            // Esto asegura que se imprima la hora "nominal" guardada en Firestore (Ej. 11:00)
            // sin que el navegador le reste 6 horas de la zona local actual.
            const eventDate = new Date(event.date);
            
            const dateStr = new Intl.DateTimeFormat('es-MX', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long',
                timeZone: 'UTC' 
            }).format(eventDate);
            
            const timeStr = new Intl.DateTimeFormat('es-MX', { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false,
                timeZone: 'UTC' 
            }).format(eventDate);
            
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
                    // Type Narrowing to satisfy TypeScript when result can be an error object without 'points'
                    if (result && result.success && 'points' in result) {
                        triggerConfetti();
                        toast({
                            title: "¡Recompensa Desbloqueada! 🎉",
                            description: `Has ganado ${result.points} KM por compartir este evento con la comunidad.`,
                            variant: "default",
                        });
                    } else if (result && !result.success) {
                        // AVISO DE QUE YA SE COBRÓ ESTE EVENTO
                        // Narrowing safely by checking if message exists on the result
                        const errMessage = 'message' in result ? result.message : "Recuerda que los B-coins por compartir evento solo se otorgan la primera vez.";
                        
                        toast({
                            title: "Gracias por difundir",
                            description: errMessage,
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
