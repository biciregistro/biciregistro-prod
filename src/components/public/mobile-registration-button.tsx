'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowDownCircle } from 'lucide-react';

interface MobileRegistrationButtonProps {
    targetId: string;
    isVisible?: boolean;
    text?: string;
    isDisabled?: boolean;
}

export function MobileRegistrationButton({ 
    targetId, 
    isVisible = true, 
    text = "Regístrate Ahora",
    isDisabled = false
}: MobileRegistrationButtonProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Si no debe ser visible por lógica de negocio, no hacemos nada
        if (!isVisible) return;

        const handleScroll = () => {
            const target = document.getElementById(targetId);
            if (!target) {
                // Si no encontramos el target, mostramos el botón por seguridad
                setShow(true);
                return;
            }

            const rect = target.getBoundingClientRect();
            
            // Lógica: Mostrar el botón MIENTRAS el objetivo NO sea completamente visible
            // O mejor: Mostrarlo hasta que el usuario llegue a la sección
            
            // isTargetVisible: El elemento está dentro de la ventana visible
            const isTargetInView = rect.top < window.innerHeight - 100; // Un poco de margen antes de ocultarlo
            
            // Si el target NO está en vista (está más abajo), mostramos el botón
            setShow(!isTargetInView);
        };

        window.addEventListener('scroll', handleScroll);
        // Check inicial (pequeño delay para asegurar renderizado)
        setTimeout(handleScroll, 100);

        return () => window.removeEventListener('scroll', handleScroll);
    }, [targetId, isVisible]);

    if (!isVisible) return null;

    const scrollToTarget = () => {
        const target = document.getElementById(targetId);
        if (target) {
            // Ajuste de offset para el header sticky si existe
            const headerOffset = 100;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          
            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    };

    return (
        <div 
            className={cn(
                "fixed bottom-6 left-4 right-4 z-50 transition-all duration-500 transform md:hidden",
                show ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
            )}
        >
            <Button 
                onClick={scrollToTarget} 
                disabled={isDisabled}
                className="w-full shadow-2xl bg-green-600 hover:bg-green-700 text-white font-bold h-14 text-lg rounded-full flex items-center justify-center gap-2 border-2 border-white/20 ring-2 ring-green-600/30"
            >
                {text}
                <ArrowDownCircle className="h-6 w-6 animate-bounce" />
            </Button>
        </div>
    );
}
