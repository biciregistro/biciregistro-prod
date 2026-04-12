'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Copy, Facebook, MessageCircle, Instagram, Share2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { eventFormSchema } from '@/lib/schemas';
import { z } from "zod";

type EventFormValues = z.infer<typeof eventFormSchema>;

interface StepProps {
    eventId: string;
    eventData: EventFormValues;
    organizerName: string;
}

export function StepFourShare({ eventId, eventData, organizerName }: StepProps) {
    const { toast } = useToast();
    const router = useRouter();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const eventUrl = `${origin}/events/${eventId}`;

    const generateMessage = () => {
        const costText = eventData.costType === 'Gratuito' ? 'Gratuito' : 'Con Costo';
        const dateStr = eventData.date ? new Date(eventData.date).toLocaleString('es-MX', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : '';

        return `¡Te invitamos a la proxima rodada de ${organizerName}, no te la puedes perder!

🗓️ Evento: ${eventData.name}
🕒 Fecha y Hora: ${dateStr}
🔗 Para garantizar tu seguridad y brindarte la mejor experiencia en el evento, Regístrate Aqui: ${eventUrl}

📍 Punto de partida: ${eventData.googleMapsUrl || 'Ver ubicación'}
🚴 Nivel: ${eventData.level || 'Todos'}
📏 Distancia: ${eventData.distance} km
🚲 Modalidad: ${eventData.modality}
💰 Precio: ${costText}

⚠️ Recomendaciones:

- Llega a tiempo, salimos puntual y no esperamos.
- Lleva tu bicicleta en buen estado
- Lleva herramientas
- Indispensable llevar equipo de protección: Casco, Guantes, Gafas, Etc
- Lleva hidratación
- Lleva dinero para imprevistos

Te esperamos!! 🚴💨`.trim();
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(eventUrl);
        toast({ title: "Enlace copiado", description: "El enlace del evento ha sido copiado al portapapeles." });
    };

    const handleCopyMessage = () => {
        const message = generateMessage();
        navigator.clipboard.writeText(message);
        toast({ title: "Mensaje copiado", description: "El mensaje de invitación completo se ha copiado." });
    };

    const handleWhatsApp = () => {
        const message = generateMessage();
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleFacebook = () => {
        // Copy message to clipboard first for easier posting
        const message = generateMessage();
        navigator.clipboard.writeText(message);
        toast({ 
            title: "Mensaje copiado", 
            description: "¡Listo! Pega el mensaje en tu publicación de Facebook." 
        });
        
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`, '_blank');
    };

    return (
        <div className="flex flex-col items-center justify-center text-center space-y-8 py-8 animate-in zoom-in-95 duration-300">
            <div className="rounded-full bg-green-100 p-6 dark:bg-green-900/20">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            
            <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">¡Tu evento ha sido publicado, es momento de difundirlo!</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    Tu evento <span className="font-semibold text-foreground">"{eventData.name}"</span> ya está visible para todos los usuarios.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg pt-4">
                 <Button type="button" variant="outline" className="h-14 text-lg gap-3" onClick={handleCopyLink}>
                    <Copy className="h-5 w-5" />
                    Copiar Enlace
                </Button>
                <Button type="button" className="h-14 text-lg gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white border-0" onClick={handleWhatsApp}>
                    <MessageCircle className="h-5 w-5" />
                    WhatsApp
                </Button>
                <Button type="button" className="h-14 text-lg gap-3 bg-[#1877F2] hover:bg-[#0C63D4] text-white border-0" onClick={handleFacebook}>
                    <Facebook className="h-5 w-5" />
                    Facebook
                </Button>
                 <Button type="button" variant="secondary" className="h-14 text-lg gap-3" onClick={handleCopyMessage}> 
                    <Share2 className="h-5 w-5" />
                    Otros Medios
                </Button>
            </div>

            <div className="pt-8 w-full border-t mt-8 flex justify-center">
                 <Link href={`/dashboard/ong/events/${eventId}`}>
                    <Button type="button" className="gap-2 px-8">
                        Ir al Tablero de Gestión <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
            </div>
        </div>
    );
}
