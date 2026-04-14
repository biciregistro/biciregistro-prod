'use client';

import { useTransition, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { createPaymentPreferenceAction } from '@/lib/actions/financial-actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FloatingPaymentButtonProps {
    eventId: string;
    registrationId: string;
    price: number;
    targetId?: string; // Optional element ID to hide when visible
}

export function FloatingPaymentButton({ eventId, registrationId, price, targetId }: FloatingPaymentButtonProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [show, setShow] = useState(true);

    useEffect(() => {
        if (!targetId) return;

        const handleScroll = () => {
            const target = document.getElementById(targetId);
            if (!target) return;

            const rect = target.getBoundingClientRect();
            // Lógica: Ocultar el botón cuando el elemento objetivo (sección de pago en el ticket) 
            // entra en la zona visible de la pantalla.
            const isTargetInView = rect.top < window.innerHeight - 50;
            
            setShow(!isTargetInView);
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check

        return () => window.removeEventListener('scroll', handleScroll);
    }, [targetId]);

    const handlePay = () => {
        startTransition(async () => {
            const result = await createPaymentPreferenceAction(eventId, registrationId);
            if (result.success && result.url) {
                window.location.href = result.url;
            } else {
                toast({
                    variant: "destructive",
                    title: "Error al iniciar pago",
                    description: result.error || "Intenta de nuevo más tarde."
                });
            }
        });
    };

    return (
        <div className={cn(
            "fixed bottom-20 left-4 right-4 z-[45] md:hidden transition-all duration-500 transform",
            show ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
        )}>
            <Button 
                onClick={handlePay}
                disabled={isPending}
                className="w-full h-14 rounded-full text-lg font-bold shadow-2xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-3 border-2 border-white/20 ring-4 ring-blue-600/20"
            >
                {isPending ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                    <>
                        <CreditCard className="h-6 w-6" />
                        Pagar ahora (${price} MXN)
                    </>
                )}
            </Button>
        </div>
    );
}
