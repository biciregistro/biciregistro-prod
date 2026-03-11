'use client';

import { Home, Calendar, Gift, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';

interface MobileBottomNavProps {
    user: User | null;
}

export function MobileBottomNav({ user }: MobileBottomNavProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Only show the bottom nav for authenticated users in the dashboard area
    if (!user || !pathname.startsWith('/dashboard')) {
        return null;
    }

    const currentTab = searchParams.get('tab') || 'garage';
    const isProfile = pathname.includes('/profile');
    
    // Check if the user is an ONG to adjust links if necessary
    const isOng = user.role === 'ong';
    
    const dashboardBase = isOng ? '/dashboard/ong' : '/dashboard';
    const profilePath = isOng ? '/dashboard/ong/profile' : '/dashboard/profile';

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t pb-safe">
            <div className="flex justify-around items-center h-16 px-2">
                <Link
                    href={`${dashboardBase}?tab=garage`}
                    className={cn(
                        "flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground transition-colors",
                        (currentTab === 'garage' && !isProfile && pathname === dashboardBase) && "text-primary font-medium"
                    )}
                >
                    <Home className="w-5 h-5" />
                    <span className="text-[10px]">Garaje</span>
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
                            href={`${dashboardBase}?tab=rewards`}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground transition-colors",
                                (currentTab === 'rewards' && !isProfile) && "text-primary font-medium"
                            )}
                        >
                            <Gift className="w-5 h-5" />
                            <span className="text-[10px]">Premios</span>
                        </Link>
                    </>
                )}

                <Link
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
