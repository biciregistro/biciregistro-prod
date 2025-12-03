'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { markAsRecovered } from '@/lib/actions/bike-actions';
import { ShieldCheck } from 'lucide-react';

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
    const router = useRouter();

    const handleRecovery = () => {
        startTransition(async () => {
            await markAsRecovered(bikeId);
            toast({
                title: "Bicicleta Actualizada",
                description: "La bicicleta ha sido marcada como recuperada."
            });
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
