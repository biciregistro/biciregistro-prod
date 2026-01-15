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

        // Texto específico para WhatsApp si es posible, o genérico
        const shareText = '¡Hola! Ayúdame a proteger mi bici y únete a la red segura de Biciregistro. Si te registras con mi enlace, ambos participamos por premios de aliados y obtienes estatus verificado prioritario.';
        
        const shareData = {
            title: 'Únete a mi red en BiciRegistro',
            text: shareText,
            url: data.shareUrl,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(`${shareText} ${data.shareUrl}`);
            toast({
                title: "Enlace copiado",
                description: "El mensaje de invitación ha sido copiado al portapapeles.",
            });
        }
    };

    if (loading) {
        return <Skeleton className="h-[240px] w-full rounded-xl" />;
    }

    if (!data) return null;

    // Calcular porcentaje de progreso para la barra
    // nextTierGoal es el objetivo total (ej. 5 para Bronce). 
    // Si tengo 2, goal es 5. Progress = 2/5 = 40%
    const nextTierGoal = (data.stats.referralsCount || 0) + (data.referralsToNextTier || 0);
    
    // Evitar division por cero
    const progress = nextTierGoal > 0 
        ? Math.min(100, ((data.stats.referralsCount || 0) / nextTierGoal) * 100)
        : 100;

    return (
        <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-sm">
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
                               navigator.clipboard.writeText(data.shareUrl);
                               toast({ title: "Copiado", description: "Enlace copiado." });
                           }}>{data.shareUrl}</span>
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
