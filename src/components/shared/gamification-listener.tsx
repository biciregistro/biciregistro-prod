'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useGamificationToast } from '@/hooks/use-gamification-toast';

function GamificationListenerContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { showRewardToast } = useGamificationToast();

    useEffect(() => {
        const points = searchParams.get('points');
        const welcome = searchParams.get('welcome');
        const actionType = searchParams.get('action_type'); // Opcional: para mensajes más específicos
        
        const pointsToAward = points ? parseInt(points) : (welcome ? parseInt(welcome) : 0);
        
        if (pointsToAward > 0) {
            let message = "¡Excelente! Has sumado kilómetros a tu perfil.";
            
            if (welcome) {
                message = "¡Bienvenido a la comunidad! Has comenzado con el pie derecho.";
            } else if (actionType === 'bike_register') {
                message = "Tu bicicleta está registrada y más segura.";
            } else if (actionType === 'event_join') {
                message = "¡Estás dentro! Prepárate para rodar.";
            } else if (actionType === 'bike_recovered') {
                message = "¡Increíble noticia! Gracias por fortalecer la comunidad.";
            }
            
            showRewardToast(pointsToAward, message);
            
            // Limpiar URL
            const params = new URLSearchParams(searchParams.toString());
            params.delete('points');
            params.delete('welcome');
            params.delete('action_type');
            
            const newSearch = params.toString();
            const newPath = newSearch ? `${pathname}?${newSearch}` : pathname;
            router.replace(newPath, { scroll: false });
        }
    }, [searchParams, router, pathname, showRewardToast]);

    return null;
}

export function GamificationListener() {
    return (
        <Suspense fallback={null}>
            <GamificationListenerContent />
        </Suspense>
    );
}
