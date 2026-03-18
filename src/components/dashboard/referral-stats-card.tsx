'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Share2, Trophy, Gauge, Star, Info, Wallet } from 'lucide-react';
import { getReferralData, ReferralData } from '@/lib/actions/referral-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { GamificationRulesSheet } from './gamification-rules-sheet';
import { cn } from '@/lib/utils';
import { getAuthenticatedUser } from '@/lib/data'; // Importar para obtener el balance real
import { User } from '@/lib/types';

interface ReferralStatsCardProps {
    user?: User | null;
}

export function ReferralStatsCard({ user }: ReferralStatsCardProps) {
    const [data, setData] = useState<ReferralData | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // El balance disponible real en vivo
    const pointsBalance = user?.gamification?.pointsBalance || 0;

    useEffect(() => {
        getReferralData().then((res) => {
            if (res.success && res.data) {
                setData(res.data);
            }
            setLoading(false);
        });
    }, []);

    const handleShare = async () => {
        if (!data) return;

        const shareText = `¡Qué onda! Te conseguí una invitación para Biciregistro. Mi bici ya tiene su Identidad Digital y fue ¡gratis!. Si registras tu bici con este link, a los dos nos regalan 200 Kilómetros para canjear por equipo, servicios o café en tiendas ciclistas. 🚴‍♂️⚡\n\nTardas 30 segundos, protege la tuya aquí 👉: ${data.shareUrl}`;
        
        const shareData = {
            title: 'Únete a BiciRegistro',
            text: shareText,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Error sharing:', err);
                navigator.clipboard.writeText(shareText);
            }
        } else {
            navigator.clipboard.writeText(shareText);
            toast({
                title: "Mensaje copiado",
                description: "El mensaje de invitación ha sido copiado al portapapeles.",
            });
        }
    };

    if (loading) {
        return <Skeleton className="h-[240px] w-full rounded-xl" />;
    }

    if (!data) return null;

    // Calcular progreso usando Kilómetros Históricos (Lifetime) para el Nivel
    const lifetimeKm = data.totalKm || 0;
    const kmNeeded = data.kmToNextTier || 0;
    const nextTierTotal = lifetimeKm + kmNeeded;
    
    const progress = !data.nextTierLabel 
        ? 100 
        : nextTierTotal > 0 
            ? Math.min(100, (lifetimeKm / nextTierTotal) * 100) 
            : 0;

    // Helper para los colores de los materiales de los badges
    const getTierStyles = (label: string) => {
        const tier = label.toLowerCase();
        if (tier.includes('iniciado')) return "bg-blue-100 text-blue-900 border-blue-200";
        if (tier.includes('bronce')) return "bg-[#B87333] text-white border-[#8B4513]";
        if (tier.includes('plata')) return "bg-[#E5E7EB] text-blue-950 border-slate-400 border";
        if (tier.includes('oro')) return "bg-yellow-400 text-blue-950 border-yellow-500";
        if (tier.includes('embajador') || tier.includes('leyenda')) return "bg-indigo-600 text-white border-indigo-400 shadow-sm";
        return "bg-primary/10 text-primary";
    };

    const StatusBlock = () => (
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-start sm:justify-center gap-2 sm:gap-1 shrink-0">
             <div className={cn(
                "px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-500",
                getTierStyles(data.tierLabel)
            )}>
                Nivel {data.tierLabel}
            </div>
            {data.nextTierLabel ? (
                <span className="text-[10px] text-muted-foreground leading-none">
                    Faltan {kmNeeded} KM para {data.nextTierLabel}
                </span>
            ) : (
                <span className="text-green-600 font-bold text-[10px] leading-none uppercase tracking-tight">¡Nivel Máximo!</span>
            )}
        </div>
    );

    return (
        <Card id="tour-referral" className="bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                    <div className="flex flex-col gap-2 sm:gap-1 flex-1">
                        <div className="sm:hidden w-full">
                            <StatusBlock />
                        </div>

                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Trophy className="h-5 w-5 text-yellow-500 shrink-0" />
                            ¡Acumula kilómetros y gana premios!
                        </CardTitle>
                        
                        <CardDescription className="text-xs md:text-sm leading-relaxed text-muted-foreground w-full pr-4">
                            Acumula kilómetros invitando amigos y realizando acciones positivas en la comunidad. 
                            <GamificationRulesSheet>
                                <button className="ml-1 text-primary font-bold hover:underline inline-flex items-center gap-0.5 group">
                                    ¿Cómo ganar más KM? <Info className="h-3 w-3 group-hover:scale-110 transition-transform" />
                                </button>
                            </GamificationRulesSheet>
                        </CardDescription>
                    </div>
                    
                    <div className="hidden sm:block">
                        <StatusBlock />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-5 mt-2">
                    {/* Progress Bar for Tiers (Lifetime KM) */}
                    <div>
                        <div className="flex justify-between text-xs mb-1.5 px-1">
                            <span className="text-muted-foreground font-medium">Progreso de Nivel</span>
                            <span className="font-bold text-muted-foreground">
                                {lifetimeKm} / {nextTierTotal} KM Históricos
                            </span>
                        </div>
                        <Progress value={progress} className="h-2 w-full" indicatorClassName="bg-yellow-500" />
                    </div>

                    {/* Spendable Balance and Actions - Hidden on Mobile */}
                    <div className="hidden md:flex flex-col sm:flex-row gap-4 items-center bg-white p-3 rounded-lg border shadow-sm">
                         <div className="flex flex-col items-center sm:items-start flex-1 w-full border-b sm:border-b-0 sm:border-r pb-3 sm:pb-0 sm:pr-4 border-slate-100">
                             <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                                 <Wallet className="w-3 h-3" /> Saldo Disponible
                             </span>
                             <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-emerald-600 font-mono tracking-tight">{pointsBalance}</span>
                                <span className="text-sm font-bold text-emerald-600/70">KM</span>
                             </div>
                             <span className="text-[10px] text-muted-foreground mt-1 text-center sm:text-left">
                                Listos para canjear por recompensas
                             </span>
                         </div>
                         
                         <div className="flex-1 w-full space-y-2">
                            <Button onClick={handleShare} className="w-full gap-2 font-semibold bg-primary hover:bg-primary/90 text-white shadow-sm" size="sm">
                                <Share2 className="h-4 w-4" />
                                Invitar a mis amigos
                            </Button>
                            <p className="text-[10px] text-center text-muted-foreground px-2">
                               <span className="font-mono select-all hover:text-primary transition-colors cursor-pointer truncate block w-full" onClick={() => {
                                   const textToCopy = `¡Qué onda! Te conseguí una invitación para Biciregistro. Mi bici ya tiene su Identidad Digital y fue ¡gratis!. Si registras tu bici con este link, a los dos nos regalan 200 Kilómetros para canjear por equipo, servicios o café en tiendas ciclistas. 🚴‍♂️⚡\n\nTardas 30 segundos, protege la tuya aquí 👉: ${data.shareUrl}`;
                                   navigator.clipboard.writeText(textToCopy);
                                   toast({ title: "Copiado", description: "Enlace copiado." });
                               }}>{data.shareUrl}</span>
                            </p>
                         </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
