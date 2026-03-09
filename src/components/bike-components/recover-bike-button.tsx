'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { markAsRecovered } from '@/lib/actions/bike-actions';
import { ShieldCheck } from 'lucide-react';
import { useGamificationToast } from '@/hooks/use-gamification-toast'; // GAMIFICACIÓN

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button 
            type="submit" 
            variant="secondary" 
            className="w-full bg-blue-500 hover:bg-blue-600 text-white" 
            disabled={pending}
        >
            <ShieldCheck className="mr-2 h-4 w-4" />
            {pending ? 'Actualizando...' : 'Marcar como Recuperada'}
        </Button>
    );
}

interface RecoverBikeButtonProps {
    bikeId: string;
    onSuccess?: () => void;
}

export function RecoverBikeButton({ bikeId, onSuccess }: RecoverBikeButtonProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const { showRewardToast } = useGamificationToast(); // Hook
    const router = useRouter();

    const handleRecovery = () => {
        startTransition(async () => {
            const result = await markAsRecovered(bikeId);
            
            if (result.success) {
                // GAMIFICACIÓN DINÁMICA
                if (result.pointsAwarded && result.pointsAwarded > 0) {
                    showRewardToast(result.pointsAwarded, "¡Qué gran noticia! Tu bicicleta ha sido recuperada. Sumaste kilómetros a tu perfil.");
                } else {
                    toast({ title: 'Éxito', description: 'Tu bicicleta ha sido marcada como recuperada.' });
                }
            } else {
                toast({ title: 'Error', description: result.error || 'Ocurrió un error inesperado.', variant: 'destructive' });
            }

            router.refresh();
            if (onSuccess) {
                onSuccess();
            }
        });
    };

    return (
        <form action={handleRecovery} className="w-full">
            <SubmitButton />
        </form>
    );
}
