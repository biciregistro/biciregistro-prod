'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Share2, Trophy, Users } from 'lucide-react';
import { getReferralData, ReferralData } from '@/lib/actions/referral-actions';
import { Skeleton } from '@/components/ui/skeleton';

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

        // Nuevo mensaje personalizado solicitado
        const shareText = `¡Hola! Te invito a usar mi enlace para blindar tu bici con *Biciregistro*, proteger a la banda ciclista del robo y combatir el mercado negro. Si te registras con mi link ambos podemos ganar premios de aliados.\n\nMi link 👉 ${data.shareUrl}\n\n¡Además, le das identidad a tu bici, la vinculas legalmente a ti y obtienes herramientas de protección activa y pasiva contra el robo!`;
        
        const shareData = {
            title: 'Únete a BiciRegistro',
            text: shareText,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Error sharing:', err);
                // Fallback copy if share fails or is cancelled
                navigator.clipboard.writeText(shareText);
            }
        } else {
            // Fallback: Copy to clipboard
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

    // Calcular porcentaje de progreso para la barra
    const nextTierGoal = (data.stats.referralsCount || 0) + (data.referralsToNextTier || 0);
    
    // Evitar division por cero
    const progress = nextTierGoal > 0 
        ? Math.min(100, ((data.stats.referralsCount || 0) / nextTierGoal) * 100)
        : 100;

    return (
        <Card id="tour-referral" className="bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Trophy className="h-5 w-5 text-yellow-500" />
                            Invita y Gana
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm mt-1">
                            Invita a tus amigos para ganar premios de nuestros aliados y subir en el ranking.
                        </CardDescription>
                    </div>
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                        Nivel {data.tierLabel}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-5">
                    
                    {/* Progress Section */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground flex items-center gap-1 font-medium">
                                <Users className="h-4 w-4" />
                                {data.stats.referralsCount} Amigos referidos
                            </span>
                            {data.nextTierLabel ? (
                                <span className="text-xs text-muted-foreground">
                                    Faltan <span className="font-bold text-foreground">{data.referralsToNextTier}</span> para {data.nextTierLabel}
                                </span>
                            ) : (
                                <span className="text-green-600 font-bold text-xs">¡Nivel Máximo!</span>
                            )}
                        </div>
                        <Progress value={progress} className="h-2 w-full" indicatorClassName="bg-yellow-500" />
                    </div>

                    {/* Action Button */}
                    <div className="space-y-2">
                        <Button onClick={handleShare} className="w-full gap-2 font-semibold" size="default">
                            <Share2 className="h-4 w-4" />
                            Invitar a mis amigos
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground">
                           Tu enlace: <span className="font-mono select-all hover:text-primary transition-colors cursor-pointer" onClick={() => {
                               const textToCopy = `¡Hola! Te invito a usar mi enlace para blindar tu bici con *Biciregistro*, proteger a la banda ciclista del robo y combatir el mercado negro. Si te registras con mi link ambos podemos ganar premios de aliados.\n\nMi link 👉 ${data.shareUrl}\n\n¡Además, le das identidad a tu bici, la vinculas legalmente a ti y obtienes herramientas de protección activa y pasiva contra el robo!`;
                               navigator.clipboard.writeText(textToCopy);
                               toast({ title: "Copiado", description: "Mensaje completo copiado." });
                           }}>{data.shareUrl}</span>
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
