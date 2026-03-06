'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGamificationToast } from '@/hooks/use-gamification-toast';

export function DashboardCelebration() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showRewardToast } = useGamificationToast();

    useEffect(() => {
        const welcomePoints = searchParams.get('welcome');
        if (welcomePoints) {
            showRewardToast(parseInt(welcomePoints), "¡Bienvenido a la comunidad! Has comenzado con el pie derecho.");
            
            // Limpiar URL
            const params = new URLSearchParams(searchParams.toString());
            params.delete('welcome');
            const newSearch = params.toString();
            const newPath = newSearch ? `/dashboard?${newSearch}` : '/dashboard';
            router.replace(newPath, { scroll: false });
        }
    }, [searchParams, router, showRewardToast]);

    return null;
}
