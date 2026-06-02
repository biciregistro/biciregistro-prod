'use client';

import { Home, Calendar, Gift, User as UserIcon, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';
import { useState, useEffect } from 'react';
import { getLatestActiveCampaignDate } from '@/lib/actions/user-rewards-actions';

interface MobileBottomNavProps {
    user: User | null;
}

export function MobileBottomNav({ user }: MobileBottomNavProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [showIndicator, setShowIndicator] = useState(false);
    
    // Evaluate these unconditionally so hooks are always called in the same order
    const isOng = user?.role === 'ong';
    const isProfile = pathname.includes('/profile');
    
    const dashboardBase = isOng ? '/dashboard/ong' : '/dashboard';
    const profilePath = isOng ? '/dashboard/ong/profile' : '/dashboard/profile';
    const currentTab = searchParams.get('tab') || 'garage';

    // Lógica para el Indicador de Recompensas
    useEffect(() => {
        // Safe check for missing user
        if (!user) return;
        
        // ONG users don't see rewards tab
        if (isOng) return;

        const checkRewardsIndicator = async () => {
            // 1. Leer última visita de localStorage
            const LOCAL_STORAGE_KEY = `bikon_last_rewards_visit_${user.id}`;
            const lastVisitString = localStorage.getItem(LOCAL_STORAGE_KEY);
            const lastVisit = lastVisitString ? new Date(lastVisitString).getTime() : 0;

            // 2. Si nunca ha visitado, mostrar y no hacer query (ahorra lecturas a DB)
            if (lastVisit === 0) {
                setShowIndicator(true);
                return;
            }

            // 3. Si ya visitó, consultar fecha de última campaña para ver si es nueva
            try {
                const latestCampaignDateISO = await getLatestActiveCampaignDate();
                if (latestCampaignDateISO) {
                    const latestCampaignDate = new Date(latestCampaignDateISO).getTime();
                    // Si hay una campaña creada DESPUÉS de la última visita, mostrar indicador
                    if (latestCampaignDate > lastVisit) {
                        setShowIndicator(true);
                    } else {
                        setShowIndicator(false);
                    }
                } else {
                     setShowIndicator(false); // No hay campañas activas
                }
            } catch (error) {
                console.error("Failed to check new rewards", error);
                // Fail silently, don't show indicator on error to avoid false expectations
                setShowIndicator(false);
            }
        };

        checkRewardsIndicator();

        // Si el usuario entra a la pestaña, limpiar indicador y guardar fecha
        if (currentTab === 'rewards' && !isProfile) {
            setShowIndicator(false);
            const LOCAL_STORAGE_KEY = `bikon_last_rewards_visit_${user.id}`;
            localStorage.setItem(LOCAL_STORAGE_KEY, new Date().toISOString());
        }

    }, [currentTab, isProfile, isOng, user?.id]); // Added optional chaining to user.id

    // Only show the bottom nav for authenticated users in the dashboard area.
    // THIS conditional return MUST go after ALL hooks.
    if (!user || !pathname.startsWith('/dashboard')) {
        return null;
    }

    return (
        <nav id="tour-mobile-nav" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t pb-safe">
            <div className="flex justify-around items-center h-16 px-2">
                <Link
                    id="tour-garage-icon"
                    href={`${dashboardBase}?tab=garage`}
                    className={cn(
                        "flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground transition-colors",
                        (currentTab === 'garage' && !isProfile && pathname === dashboardBase) && "text-primary font-medium"
                    )}
                >
                    {isOng ? <LayoutDashboard className="w-5 h-5" /> : <Home className="w-5 h-5" />}
                    <span className="text-[10px]">{isOng ? 'Panel' : 'Garaje'}</span>
                </Link>

                {!isOng && (
                    <>
                        <Link
                            href={`${dashboardBase}?tab=events`}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground transition-colors",
                                (currentTab === 'events' && !isProfile) && "text-primary font-medium"
                            )}
                        >
                            <Calendar className="w-5 h-5" />
                            <span className="text-[10px]">Eventos</span>
                        </Link>

                        <Link
                            id="tour-mobile-rewards"
                            href={`${dashboardBase}?tab=rewards`}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 relative text-muted-foreground transition-colors",
                                (currentTab === 'rewards' && !isProfile) && "text-primary font-medium"
                            )}
                            onClick={() => {
                                // Desactivación optimista y guardado local al hacer click
                                setShowIndicator(false);
                                const LOCAL_STORAGE_KEY = `bikon_last_rewards_visit_${user.id}`;
                                localStorage.setItem(LOCAL_STORAGE_KEY, new Date().toISOString());
                            }}
                        >
                            <div className="relative">
                                <Gift className="w-5 h-5" />
                                {showIndicator && (
                                    <>
                                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-[1.5px] border-background"></span>
                                        </span>
                                    </>
                                )}
                            </div>
                            <span className="text-[10px]">Premios</span>
                        </Link>
                    </>
                )}

                <Link
                    id="tour-mobile-profile"
                    href={profilePath}
                    className={cn(
                        "flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground transition-colors",
                        isProfile && "text-primary font-medium"
                    )}
                >
                    <UserIcon className="w-5 h-5" />
                    <span className="text-[10px]">Perfil</span>
                </Link>
            </div>
        </nav>
    );
}