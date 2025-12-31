'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { createPaymentPreferenceAction } from '@/lib/actions/financial-actions';
import { useToast } from '@/hooks/use-toast';

interface FloatingPaymentButtonProps {
    eventId: string;
    registrationId: string;
    price: number;
}

export function FloatingPaymentButton({ eventId, registrationId, price }: FloatingPaymentButtonProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

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
        <div className="fixed bottom-6 left-4 right-4 z-50 md:hidden animate-in slide-in-from-bottom-10 duration-500">
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
