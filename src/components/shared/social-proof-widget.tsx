'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils'; // Utilidad de Shadcn UI

interface SocialProofWidgetProps {
  messages: string[];
}

// Export default to guarantee a clean module load for Next.js dynamic or standard imports
export default function SocialProofWidget({ messages }: SocialProofWidgetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(true);

  // CA4: Cierre manual
  useEffect(() => {
    const dismissed = sessionStorage.getItem('social_proof_dismissed') === 'true';
    if (!dismissed && messages && messages.length > 0) {
      setIsDismissed(false);
    }
  }, [messages]);

  // CA3: Comportamiento UX/UI con Tiempos Específicos
  useEffect(() => {
    if (isDismissed || !messages || messages.length === 0) return;

    let isComponentMounted = true;
    
    // Timer inicial antes de mostrar la primera notificación
    const initialDelay = setTimeout(() => {
      if (!isComponentMounted) return;
      setIsVisible(true);
    }, 5000);

    // Bucle principal: 
    // - Visible: 7.77 segundos
    // - Oculto: 11.11 segundos
    // - Total del ciclo: 18.88 segundos (18880ms)
    const cycleInterval = setInterval(() => {
      if (!isComponentMounted) return;
      
      setIsVisible(false); // Fade-out

      // Esperamos el tiempo de transición CSS (aprox 500ms) para cambiar el texto oculto
      setTimeout(() => {
        if (!isComponentMounted) return;
        
        setCurrentIndex((prevIndex) => {
          return prevIndex >= messages.length - 1 ? 0 : prevIndex + 1;
        });
        
        // El widget permanecerá oculto 11.11s. Ya esperamos ~500ms en la transición, 
        // por lo que esperamos el resto antes de hacer fade-in.
        setTimeout(() => {
          if (!isComponentMounted) return;
          setIsVisible(true); 
        }, 11110 - 500); // 11.11 segundos oculto
        
      }, 500);

    }, 18880); // 7.77s (7770ms) + 11.11s (11110ms) = 18880ms

    return () => {
      isComponentMounted = false;
      clearTimeout(initialDelay);
      clearInterval(cycleInterval);
    };
  }, [isDismissed, messages]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsDismissed(true);
      sessionStorage.setItem('social_proof_dismissed', 'true');
    }, 500); 
  };

  if (isDismissed || !messages || messages.length === 0) {
    return null;
  }

  const widgetPosition = 'fixed z-50 md:bottom-6 md:left-6 bottom-auto top-20 left-1/2 md:left-6 md:top-auto md:-translate-x-0 -translate-x-1/2 px-4 md:px-0 w-[95%] md:w-auto max-w-sm';

  const animationClasses = isVisible 
    ? 'opacity-100 translate-y-0 scale-100' 
    : 'opacity-0 md:translate-y-4 -translate-y-4 scale-95 pointer-events-none';

  return (
    <div className={cn(
      widgetPosition,
      'transition-all duration-500 ease-in-out',
      animationClasses
    )}>
      <div className="bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl overflow-hidden relative flex flex-col justify-center min-h-[72px] p-4 pr-10">
        <div className="flex-grow w-full">
          <p className="text-sm font-medium text-slate-800 leading-snug">
            {messages[currentIndex]}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
            Actividad Reciente
          </p>
        </div>

        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors group"
          aria-label="Cerrar notificación"
        >
          <X size={14} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );
}