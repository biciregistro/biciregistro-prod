import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DownloadEmergencyStickerButton } from '@/components/dashboard/download-sticker-button';
import { PlusCircle, User as UserIcon, ChevronRight } from 'lucide-react';
import type { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/icons/logo';

interface ActionPanelProps {
    user: User;
    isComplete: boolean;
}

export function ActionPanel({ user, isComplete }: ActionPanelProps) {
    const userNameInitial = (user?.name || user?.email || "?").charAt(0).toUpperCase();
    const displayName = user?.name || "Usuario";
    const pointsBalance = user.gamification?.pointsBalance || 0;

    return (
        <>
            {/* Desktop Version: Full panel */}
            <div className="hidden md:block p-6 bg-card border rounded-lg mb-8">
                <h1 className="text-2xl font-bold">¡Hola, {user.name}!</h1>
                <p className="text-muted-foreground mb-4">
                    {isComplete 
                        ? "Bienvenido de nuevo a tu garaje. Desde aquí puedes gestionar tus bicicletas y tu perfil."
                        : "¡Bienvenido a BiciRegistro! Completa tu perfil para poder registrar tu primera bicicleta."
                    }
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button asChild>
                        <Link href="/dashboard/profile" id="tour-profile">
                            <UserIcon className="mr-2 h-4 w-4" />
                            {isComplete ? 'Mi Perfil' : 'Completa tu perfil'}
                        </Link>
                    </Button>
                    
                    {isComplete ? (
                        <Button asChild>
                            <Link href="/dashboard/register" id="tour-register-bike">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Registrar Bici
                            </Link>
                        </Button>
                    ) : (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span tabIndex={0}>
                                        <Button disabled className="w-full sm:w-auto" id="tour-register-bike">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Registrar Bici
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Por favor completa tu perfil antes de registrar una bicicleta.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    <DownloadEmergencyStickerButton user={user} />
                </div>
            </div>

            {/* Mobile Version: Compact Header */}
            <div className="md:hidden flex flex-col bg-card border-b -mx-4 px-4 py-3 mb-6 sticky top-0 z-40 space-y-3">
                {/* Top Row: Logo (Left) & User Info (Right) */}
                <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center scale-75 origin-left">
                        <Logo />
                    </Link>
                    
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col text-right">
                            <span className="text-xs text-muted-foreground leading-none">Hola,</span>
                            <span className="font-semibold text-sm leading-tight line-clamp-1 max-w-[120px]">{displayName}</span>
                        </div>
                        <Avatar className="h-9 w-9 border border-primary/10">
                            <AvatarImage src={user.avatarUrl} alt={displayName} />
                            <AvatarFallback className="bg-primary/5 text-primary text-sm">
                                {userNameInitial}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </div>
                
                {/* Bottom Row: Seamless Text Line */}
                <div className="flex items-center justify-between text-[13px] w-full pt-1 border-t border-border/50">
                    <span className="text-muted-foreground">
                        Tienes <span className="font-bold text-foreground">{pointsBalance} KM</span> para canjear
                    </span>
                    
                    <Link 
                        href="/dashboard?tab=rewards" 
                        className="font-semibold text-primary flex items-center hover:underline whitespace-nowrap"
                    >
                        Ir a mis regalos
                        <ChevronRight className="h-4 w-4 ml-0.5" />
                    </Link>
                </div>
            </div>
        </>
    );
}
