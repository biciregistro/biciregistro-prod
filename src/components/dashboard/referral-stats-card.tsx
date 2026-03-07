'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Share2, Trophy, Gauge, Star, Info } from 'lucide-react';
import { getReferralData, ReferralData } from '@/lib/actions/referral-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { GamificationRulesSheet } from './gamification-rules-sheet';
import { cn } from '@/lib/utils';

export function ReferralStatsCard() {
    const [data, setData] = useState<ReferralData | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

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

        const shareText = `¡Hola! Te invito a usar mi enlace para blindar tu bici con *Biciregistro*, proteger a la banda ciclista del robo y combatir el mercado negro. Si te registras con mi link ambos podemos ganar premios de aliados y acumular kilómetros.\n\nMi link 👉 ${data.shareUrl}\n\n¡Además, le das identidad a tu bici, la vinculas legalmente a ti y obtienes herramientas de protección activa y pasiva contra el robo!`;
        
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

    // Calcular progreso usando Kilómetros
    const currentKm = data.totalKm || 0;
    const kmNeeded = data.kmToNextTier || 0;
    const nextTierTotal = currentKm + kmNeeded;
    
    const progress = !data.nextTierLabel 
        ? 100 
        : nextTierTotal > 0 
            ? Math.min(100, (currentKm / nextTierTotal) * 100) 
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
        <div className="flex items-center gap-3 shrink-0">
            <div className={cn(
                "px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-500",
                getTierStyles(data.tierLabel)
            )}>
                Nivel {data.tierLabel}
            </div>
            {data.nextTierLabel ? (
                <span className="text-xs text-muted-foreground leading-none">
                    Faltan <span className="font-bold text-foreground">{kmNeeded} KM</span> para {data.nextTierLabel}
                </span>
            ) : (
                <span className="text-green-600 font-bold text-xs leading-none uppercase tracking-tight">¡Nivel Máximo!</span>
            )}
        </div>
    );

    return (
        <Card id="tour-referral" className="bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                    <div className="flex flex-col gap-2 sm:gap-1 flex-1">
                        <div className="sm:hidden w-full flex justify-start">
                            <StatusBlock />
                        </div>

                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Trophy className="h-5 w-5 text-yellow-500 shrink-0" />
                            ¡Acumula kilómetros y gana premios!
                        </CardTitle>
                        
                        <CardDescription className="text-xs md:text-sm leading-relaxed text-muted-foreground w-full">
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
                <div className="space-y-5">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground flex items-center gap-1 font-medium">
                                <Gauge className="h-4 w-4 text-primary" />
                                {currentKm} KM Recorridos
                            </span>
                            <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md">
                                {Math.round(progress)}%
                            </span>
                        </div>
                        <Progress value={progress} className="h-2 w-full" indicatorClassName="bg-yellow-500" />
                        <p className="text-[10px] text-muted-foreground mt-1 text-right">
                            {data.stats.referralsCount} amigos invitados
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Button onClick={handleShare} className="w-full gap-2 font-semibold" size="default">
                            <Share2 className="h-4 w-4" />
                            Invitar a mis amigos
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground">
                           Tu enlace: <span className="font-mono select-all hover:text-primary transition-colors cursor-pointer" onClick={() => {
                               const textToCopy = `¡Hola! Te invito a usar mi enlace para blindar tu bici con *Biciregistro*... ${data.shareUrl}`;
                               navigator.clipboard.writeText(textToCopy);
                               toast({ title: "Copiado", description: "Enlace copiado." });
                           }}>{data.shareUrl}</span>
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
