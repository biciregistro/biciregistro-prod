'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function PaymentStatusHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const collectionStatus = searchParams.get('collection_status');

        if (collectionStatus === 'approved') {
            // Delay to ensure hydration and UI readiness
            setTimeout(() => {
                toast({
                    title: "¡Pago Exitoso!",
                    description: "Tu pago ha sido procesado y aplicado correctamente.",
                    className: "bg-green-50 border-green-200 text-green-900 duration-5000"
                });
            }, 500);
        } else if (collectionStatus === 'failure') {
            setTimeout(() => {
                toast({
                    variant: "destructive",
                    title: "Pago Fallido",
                    description: "Hubo un problema al procesar tu pago. Por favor intenta nuevamente.",
                });
            }, 500);
        } else if (collectionStatus === 'pending') {
             setTimeout(() => {
                toast({
                    title: "Pago Pendiente",
                    description: "Tu pago está siendo procesado por Mercado Pago.",
                    className: "bg-yellow-50 border-yellow-200 text-yellow-900"
                });
            }, 500);
        }
    }, [searchParams, toast]);

    return null; // This component does not render anything visual
}
