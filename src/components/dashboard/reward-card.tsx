import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Campaign, UserReward } from '@/lib/types';
import { Calendar, Store, Info, CheckCircle2, Ticket } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { purchaseReward, redeemReward } from '@/lib/actions/reward-actions';
import { useToast } from '@/hooks/use-toast';
import { triggerConfetti } from '@/lib/confetti';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

interface RewardCardProps {
    campaign: Campaign & { advertiserName?: string };
    userPoints: number;
    userPurchases: UserReward[];
}

export function RewardCard({ campaign, userPoints, userPurchases }: RewardCardProps) {
    const { toast } = useToast();
    
    // UI States
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [consentOpen, setConsentOpen] = useState(false);
    const [redeemConfirmOpen, setRedeemConfirmOpen] = useState(false);
    
    // Action States
    const [consentAccepted, setConsentAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    // Business Logic
    const isGiveaway = campaign.type === 'giveaway';
    const price = campaign.priceKm || 0;
    const isAffordable = userPoints >= price;
    const diff = price - userPoints;
    const maxLimit = campaign.maxPerUser !== undefined ? campaign.maxPerUser : 1;

    // Filter purchases specifically for this campaign
    const purchasedCoupons = userPurchases.filter(ur => ur.campaignId === campaign.id);
    const totalPurchasedForCampaign = purchasedCoupons.length;
    
    // For standard 'reward': check if user has an UNREDEEMED coupon pending to be used
    const unredeemedCoupons = purchasedCoupons.filter(ur => ur.status === 'purchased');
    const hasActiveCoupon = !isGiveaway && unredeemedCoupons.length > 0;
    const activeCouponId = hasActiveCoupon ? unredeemedCoupons[0].id : null;

    // Evaluate Max Limits
    // maxReached is true IF the campaign has a limit (maxLimit > 0) AND the user bought that exact amount or more.
    const maxReached = maxLimit > 0 && totalPurchasedForCampaign >= maxLimit;

    // A reward is "fully redeemed" (Exhausted) if they reached the max limit AND have nothing left to redeem.
    const isFullyRedeemed = !isGiveaway && maxReached && !hasActiveCoupon;

    // A giveaway is "exhausted" if they reached the max limit (no redeeming needed).
    const isGiveawayExhausted = isGiveaway && maxReached;

    const handlePurchase = async () => {
        if (!consentAccepted) return;
        setLoading(true);

        const result = await purchaseReward(campaign.id, {
            accepted: true,
            text: "Acepto compartir mis datos básicos (Nombre, Correo, Ciudad) con el Aliado para hacer válido este beneficio o participación."
        });

        setLoading(false);

        if (result?.success) {
            setConsentOpen(false);
            setDetailsOpen(false);
            triggerConfetti();
            toast({
                title: `¡Felicidades!`,
                description: isGiveaway 
                    ? `Has adquirido 1 boleto para ${campaign.title}.` 
                    : `Has adquirido ${campaign.title}. Te hemos enviado un correo.`,
                variant: 'default'
            });
        } else {
            toast({
                title: "Error",
                description: result?.error || "No se pudo procesar la compra.",
                variant: "destructive"
            });
        }
    };

    const handleRedeem = async () => {
        if (!activeCouponId || isGiveaway) return;
        setLoading(true);

        const result = await redeemReward(activeCouponId);

        setLoading(false);

        if (result?.success) {
            setRedeemConfirmOpen(false);
            toast({
                title: "Canje Exitoso",
                description: "Has completado el canje de tu cupón.",
                variant: 'default'
            });
        } else {
            toast({
                title: "Error",
                description: result?.error || "No se pudo canjear el cupón.",
                variant: "destructive"
            });
        }
    };

    const formatConditions = (conds: string | undefined) => {
        if (!conds) return null;
        if (conds.includes('<ul>') || conds.includes('<li>')) {
            return <div dangerouslySetInnerHTML={{ __html: conds }} className="text-sm text-muted-foreground mt-2 list-inside list-disc" />;
        }
        return (
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                {conds.split('\n').filter(c => c.trim().length > 0).map((c, i) => (
                    <li key={i}>{c.replace(/^-s*/, '')}</li>
                ))}
            </ul>
        );
    };

    return (
        <>
            {/* MAIN CARD */}
            <Card className={`overflow-hidden hover:shadow-md transition-all flex flex-col h-full relative group ${isGiveaway ? 'border-purple-200' : ''}`}>
                <div className="relative aspect-[16/9] w-full bg-muted">
                    <Image 
                        src={campaign.bannerImageUrl} 
                        alt={campaign.title} 
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    
                    {/* Visual Badges top-right */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        {isGiveaway && (
                            <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow flex items-center gap-1">
                                <Ticket className="w-3 h-3" /> Sorteo
                            </div>
                        )}
                        {hasActiveCoupon && (
                            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Adquirido
                            </div>
                        )}
                        {isFullyRedeemed && (
                            <div className="bg-slate-700 text-white px-3 py-1 rounded-full text-xs font-bold shadow flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-slate-300" /> Canjeado
                            </div>
                        )}
                    </div>
                </div>
                
                <CardContent className="p-4 flex flex-col flex-grow">
                    <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="font-bold text-lg line-clamp-2 leading-tight">{campaign.title}</h3>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Store className="w-4 h-4" />
                        <span className="line-clamp-1">{campaign.advertiserName}</span>
                    </div>
                    
                    <div className="mt-auto space-y-3">
                        
                        {/* Stats Row: Shown if it's a Giveaway OR if it's a Reward with multiple uses allowed */}
                        {((isGiveaway && totalPurchasedForCampaign > 0) || (!isGiveaway && (maxLimit > 1 || maxLimit === 0) && totalPurchasedForCampaign > 0)) && (
                            <div className={`text-xs p-2 rounded border font-medium flex justify-between items-center ${isGiveaway ? 'bg-purple-50 text-purple-900 border-purple-100' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                <span>{isGiveaway ? 'Tus boletos:' : 'Comprados:'}</span>
                                <Badge variant="secondary" className={isGiveaway ? 'bg-purple-200 text-purple-900' : ''}>
                                    {totalPurchasedForCampaign} {maxLimit > 0 ? `/ ${maxLimit}` : ''}
                                </Badge>
                            </div>
                        )}

                        <div className="flex justify-between items-center">
                            <Badge variant={(hasActiveCoupon || isFullyRedeemed || isGiveawayExhausted) ? "outline" : "secondary"} className={`text-sm px-3 py-1 font-mono ${isGiveaway && !isGiveawayExhausted ? 'bg-purple-100 text-purple-900 border-transparent' : ''}`}>
                                {price} KM
                            </Badge>
                            
                            {!hasActiveCoupon && !isFullyRedeemed && !isGiveawayExhausted && !isAffordable && (
                                <span className="text-xs text-amber-600 font-medium">Te faltan {diff} KM</span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" onClick={() => setDetailsOpen(true)} className="w-full">
                                <Info className="w-4 h-4 mr-1" /> Detalles
                            </Button>
                            
                            {/* Decision Matrix for Main Action Button */}
                            {hasActiveCoupon ? (
                                // Priority 1: User has an active unredeemed physical reward. Must redeem before buying another.
                                <Button size="sm" onClick={() => setRedeemConfirmOpen(true)} className="w-full bg-green-600 hover:bg-green-700">
                                    Canjear
                                </Button>
                            ) : isFullyRedeemed ? (
                                // Priority 2: User exhausted all allowed physical rewards.
                                <Button size="sm" disabled variant="secondary" className="w-full bg-slate-100 text-slate-500 border-slate-200">
                                    Canjeado
                                </Button>
                            ) : maxReached ? (
                                // Priority 3: User reached the max limit (applies to giveaways or rewards).
                                <Button size="sm" disabled className="w-full">Límite alcanzado</Button>
                            ) : (
                                // Priority 4: User is allowed to buy.
                                <Button 
                                    size="sm" 
                                    onClick={() => setConsentOpen(true)} 
                                    disabled={!isAffordable} 
                                    className={`w-full ${isGiveaway ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                                >
                                    {isGiveaway ? 'Comprar Boleto' : 'Comprar'}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* DETAILS MODAL */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {campaign.title} 
                            {isGiveaway && <Badge className="ml-2 bg-purple-600">Sorteo</Badge>}
                        </DialogTitle>
                        <DialogDescription className="flex items-center gap-1 mt-1">
                            <Store className="w-4 h-4" /> {campaign.advertiserName}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="relative w-full h-48 rounded-md overflow-hidden mb-4 bg-muted">
                        <Image src={campaign.bannerImageUrl} alt={campaign.title} fill className="object-cover" />
                    </div>

                    <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                        <div>
                            <h4 className="font-semibold text-sm mb-1">Descripción</h4>
                            <p className="text-sm text-muted-foreground">{campaign.description}</p>
                        </div>
                        
                        {!isGiveaway && campaign.conditions && (
                            <div>
                                <h4 className="font-semibold text-sm mb-1 text-amber-700">Condiciones de Canje</h4>
                                {formatConditions(campaign.conditions)}
                            </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded-md">
                            <Calendar className="w-4 h-4" />
                            <span>{isGiveaway ? 'Sorteo válido hasta:' : 'Válido hasta:'} {new Date(campaign.endDate).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <DialogFooter className="mt-6 flex gap-2">
                        <Button variant="outline" onClick={() => setDetailsOpen(false)} className="flex-1">Cerrar</Button>
                        {(!hasActiveCoupon && !isFullyRedeemed && !maxReached) && (
                            <Button 
                                onClick={() => { setDetailsOpen(false); setConsentOpen(true); }} 
                                disabled={!isAffordable}
                                className={`flex-1 ${isGiveaway ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                            >
                                {isAffordable ? (isGiveaway ? `Comprar Boleto (${price} KM)` : `Comprar por ${price} KM`) : 'KM Insuficientes'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CONSENT / PURCHASE MODAL */}
            <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Compra</DialogTitle>
                        <DialogDescription>
                            Estás a punto de usar <strong>{price} KM</strong> para adquirir <strong>{isGiveaway ? '1 boleto para ' : ''}{campaign.title}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="bg-muted p-4 rounded-md mt-4">
                        <div className="flex items-start space-x-3">
                            <Checkbox 
                                id="consent" 
                                checked={consentAccepted} 
                                onCheckedChange={(checked) => setConsentAccepted(checked === true)}
                                className="mt-1"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label htmlFor="consent" className="text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Acepto compartir mis datos
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    Al continuar, aceptas compartir tu Nombre, Correo y Ciudad con <strong>{campaign.advertiserName}</strong> únicamente para fines de validación y entrega de este beneficio, conforme a nuestro Aviso de Privacidad.
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button variant="ghost" onClick={() => setConsentOpen(false)}>Cancelar</Button>
                        <Button onClick={handlePurchase} disabled={!consentAccepted || loading} className={isGiveaway ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Confirmar Compra
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* REDEEM CONFIRMATION MODAL (Only for non-giveaways) */}
            {!isGiveaway && (
                <Dialog open={redeemConfirmOpen} onOpenChange={setRedeemConfirmOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Canjear Beneficio</DialogTitle>
                            <DialogDescription className="text-amber-600 font-medium mt-2">
                                ⚠️ ATENCIÓN: Solo presiona este botón si estás físicamente con el aliado y te lo está solicitando.
                            </DialogDescription>
                        </DialogHeader>

                        <p className="text-sm mt-2">
                            Estás a punto de canjear tu beneficio <strong>"{campaign.title}"</strong> con {campaign.advertiserName}. 
                            Una vez confirmado, el cupón desaparecerá de tu lista y no podrá deshacerse.
                        </p>

                        <DialogFooter className="mt-6">
                            <Button variant="outline" onClick={() => setRedeemConfirmOpen(false)}>Cancelar</Button>
                            <Button onClick={handleRedeem} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Sí, Canjear
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
