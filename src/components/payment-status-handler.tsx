'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { verifyPaymentAction } from '@/lib/actions/financial-actions';

export function PaymentStatusHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const processedRef = useRef(false);

    useEffect(() => {
        const collectionStatus = searchParams.get('collection_status');
        const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');

        if (collectionStatus === 'approved' && !processedRef.current) {
            processedRef.current = true;

            // Feedback visual inmediato
            setTimeout(() => {
                toast({
                    title: "¡Pago Exitoso!",
                    description: "Tu pago ha sido procesado correctamente.",
                    className: "bg-green-50 border-green-200 text-green-900 duration-5000"
                });
            }, 500);

            // Verificación Activa (Fallback por si falla el webhook)
            if (paymentId) {
                verifyPaymentAction(paymentId).then((result) => {
                    if (result.success) {
                        console.log("Pago verificado y actualizado activamente.");
                        // Refrescar la página para asegurar que el botón "Pagar" desaparezca
                        // y el estado "Pagado" venga desde el servidor.
                        router.refresh(); 
                    } else {
                        console.warn("Verificación activa falló:", result.error);
                        // No mostramos error al usuario porque visualmente ya le dijimos que es exitoso
                        // y probablemente el webhook sí funcione o sea un falso negativo temporal.
                    }
                });
            }
        } else if (collectionStatus === 'failure' && !processedRef.current) {
            processedRef.current = true;
            setTimeout(() => {
                toast({
                    variant: "destructive",
                    title: "Pago Fallido",
                    description: "Hubo un problema al procesar tu pago. Por favor intenta nuevamente.",
                });
            }, 500);
        } else if (collectionStatus === 'pending' && !processedRef.current) {
             processedRef.current = true;
             setTimeout(() => {
                toast({
                    title: "Pago Pendiente",
                    description: "Tu pago está siendo procesado por Mercado Pago.",
                    className: "bg-yellow-50 border-yellow-200 text-yellow-900"
                });
            }, 500);
        }
    }, [searchParams, toast, router]);

    return null; 
}
