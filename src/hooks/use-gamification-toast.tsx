'use client';

import { useToast } from '@/hooks/use-toast';
import { triggerConfetti } from '@/lib/confetti';
import { Star } from 'lucide-react';

export function useGamificationToast() {
  const { toast } = useToast();

  const showRewardToast = (points: number, message: string) => {
    // 1. Disparar confeti
    triggerConfetti();

    // 2. Mostrar Toast personalizado
    toast({
      title: `¡Ganaste +${points} KM!`,
      description: message,
      action: (
        <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center border-2 border-yellow-400 shadow-sm shrink-0">
            <Star className="h-6 w-6 text-yellow-600 fill-yellow-400" />
        </div>
      ),
      className: "border-yellow-400 border-2 bg-yellow-50 dark:bg-yellow-950/50 flex items-center gap-2",
    });
  };

  return { showRewardToast };
}
