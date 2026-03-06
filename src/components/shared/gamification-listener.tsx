'use client';

import { useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useGamificationToast } from '@/hooks/use-gamification-toast';

function GamificationListenerContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { showRewardToast } = useGamificationToast();
    
    // Ref to track processed parameters and prevent duplicate triggers
    const processedParamsRef = useRef<string | null>(null);

    useEffect(() => {
        const points = searchParams.get('points');
        const welcome = searchParams.get('welcome');
        const actionType = searchParams.get('action_type'); // Opcional: para mensajes más específicos
        
        // Create a unique key for the current parameters to avoid re-processing same event
        const paramsKey = `${points}-${welcome}-${actionType}`;
        
        // If we already processed this exact set of parameters, do nothing
        if (processedParamsRef.current === paramsKey) return;

        const pointsToAward = points ? parseInt(points) : (welcome ? parseInt(welcome) : 0);
        
        if (pointsToAward > 0) {
            // Mark as processed immediately
            processedParamsRef.current = paramsKey;

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
            
            // Clean URL after a slight delay to allow toast to mount and avoid conflicting updates
            const timer = setTimeout(() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete('points');
                params.delete('welcome');
                params.delete('action_type');
                
                const newSearch = params.toString();
                const newPath = newSearch ? `${pathname}?${newSearch}` : pathname;
                router.replace(newPath, { scroll: false });
                
                // Clear the ref after navigation completes (optional, but good for cleanup)
                // Though usually the component re-renders with new params and we start fresh.
            }, 1000);

            return () => clearTimeout(timer);
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
