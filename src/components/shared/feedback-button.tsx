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
      const updateUrl = () => setCurrentUrl(window.location.href);
      updateUrl();
    }
  }, []);

  const phoneNumber = "525569691709"; // Formato internacional sin + para wa.me link
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Calcular URL al momento del clic para tener la ruta exacta actual
    const url = window.location.href;
    const message = `Hola, necesito ayuda con respecto a la página ${url}: `;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    // Actualizar el href del evento y dejar que proceda, o abrir window.open
    e.preventDefault();
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isMounted) return null;

  return (
    <>
        {/* Desktop Feedback / Support Button */}
        <div className="hidden md:block fixed bottom-6 right-6 z-50 print:hidden animate-in fade-in zoom-in duration-300">
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
                    aria-label="¿Necesitas ayuda? Contáctanos por WhatsApp"
                >
                    <MessageSquareText className="h-7 w-7" />
                </a>
                </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="mr-2 max-w-[200px] text-center">
                <p className="font-semibold text-sm">¿Necesitas ayuda?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Contáctanos por WhatsApp</p>
            </TooltipContent>
            </Tooltip>
        </TooltipProvider>
        </div>

        {/* Mobile Support Button (Floating Tab on Center Right) */}
        {/* Usamos origin-bottom-right y ajustamos para que quede adherido EXACTAMENTE al borde */}
        <div className="md:hidden fixed top-1/2 right-0 z-40 print:hidden -translate-y-1/2">
            <div className="-rotate-90 origin-bottom-right absolute right-0 bottom-0 translate-y-[50%] hover:scale-105 transition-transform duration-200">
                <Button
                    asChild
                    className="h-10 rounded-t-xl rounded-b-none shadow-lg bg-green-600 hover:bg-green-700 text-white border-2 border-b-0 border-white dark:border-slate-800 flex items-center gap-2 px-4 text-xs font-semibold"
                >
                    <a 
                        href="#" 
                        onClick={handleClick} 
                        aria-label="¿Necesitas ayuda? Escríbenos por WhatsApp"
                    >
                        <MessageSquareText className="h-4 w-4" />
                        <span>Ayuda</span>
                    </a>
                </Button>
            </div>
        </div>
    </>
  );
}
