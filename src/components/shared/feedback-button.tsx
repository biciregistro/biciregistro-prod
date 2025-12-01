'use client';

import { useEffect, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function FeedbackButton() {
  // Usamos estado para la URL para asegurar consistencia en hidratación
  const [currentUrl, setCurrentUrl] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      // Actualizar URL cuando cambie (aunque en layout se monta una vez, 
      // si navegamos, el href del link se recalcula al hacer click si es un <a> simple,
      // pero para el estado inicial usamos esto).
      // Mejor aún: leer window.location.href en el momento del click o renderizar dinámicamente.
      // Dado que es un <a> nativo, podemos dejar que el navegador maneje el evento, 
      // pero para pre-llenar el href necesitamos saber la URL.
      
      const updateUrl = () => setCurrentUrl(window.location.href);
      updateUrl();
      
      // Opcional: Escuchar cambios de ruta si fuera necesario actualizar el href dinámicamente
      // sin recargar componentes, pero un <a> con href fijo necesita reactividad.
      // En Next.js App Router, layout no se desmonta. 
      // Usaremos un onClick para garantizar la URL más reciente.
    }
  }, []);

  const phoneNumber = "525547716640"; // Formato internacional sin + para wa.me link
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Calcular URL al momento del clic para tener la ruta exacta actual
    const url = window.location.href;
    const message = `Hola, en la pagina ${url} encontré el siguiente problema o area de oportunidad: `;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    // Actualizar el href del evento y dejar que proceda, o abrir window.open
    e.preventDefault();
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isMounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden animate-in fade-in zoom-in duration-300">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              size="icon"
              className="h-14 w-14 rounded-full shadow-xl bg-green-600 hover:bg-green-700 text-white border-2 border-white dark:border-slate-800 transition-transform hover:scale-110"
            >
              <a 
                href="#" 
                onClick={handleClick} 
                aria-label="Reportar problema o enviar feedback"
              >
                <MessageSquareText className="h-7 w-7" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="mr-2">
            <p className="font-semibold">¿Tienes feedback?</p>
            <p className="text-xs text-muted-foreground">Repórtalo por WhatsApp</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
