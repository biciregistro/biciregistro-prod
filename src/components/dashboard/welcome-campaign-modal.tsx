import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Campaign } from '@/lib/types';
import { getActiveCampaigns, recordCampaignConversion } from '@/lib/actions/campaign-actions';
import Image from 'next/image';
import { Loader2, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { triggerConfetti } from '@/lib/confetti';
import { useGamificationToast } from '@/hooks/use-gamification-toast';

interface WelcomeCampaignModalProps {
    onCloseOrComplete: () => void;
}

export function WelcomeCampaignModal({ onCloseOrComplete }: WelcomeCampaignModalProps) {
    const [campaign, setCampaign] = useState<Campaign & { advertiserName?: string } | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const { toast } = useToast();
    const { showRewardToast } = useGamificationToast();

    useEffect(() => {
        const fetchCampaign = async () => {
            try {
                const campaigns = await getActiveCampaigns('welcome_banner');
                if (campaigns && campaigns.length > 0) {
                    // Take the first active welcome campaign
                    setCampaign(campaigns[0]);
                    setIsOpen(true);
                } else {
                    onCloseOrComplete();
                }
            } catch (error) {
                console.error('Failed to load welcome campaign', error);
                onCloseOrComplete();
            } finally {
                setLoading(false);
            }
        };

        fetchCampaign();
    }, [onCloseOrComplete]);

    const handleAccept = async () => {
        if (!campaign) return;
        setActionLoading(true);

        const result = await recordCampaignConversion(campaign.id, {
            accepted: true,
            text: "Acepto los términos y condiciones de la campaña de bienvenida."
        });

        setActionLoading(false);

        if (result?.success) {
            triggerConfetti();
            if (result.pointsAwarded && result.pointsAwarded > 0) {
                showRewardToast(result.pointsAwarded, "¡Puntos extra por aceptar tu regalo!");
            }
            
            // Handle redirect or download
            if (campaign.type === 'link' && campaign.targetUrl) {
                window.open(campaign.targetUrl, '_blank');
            } else if (campaign.type === 'download' && campaign.assetUrl) {
                window.open(campaign.assetUrl, '_blank');
            }

            setIsOpen(false);
            onCloseOrComplete();
        } else {
            toast({
                title: "Ocurrió un error",
                description: result?.error || "No pudimos procesar tu regalo en este momento.",
                variant: "destructive"
            });
        }
    };

    const handleDecline = () => {
        setIsOpen(false);
        onCloseOrComplete();
    };

    if (loading) {
        return null; // Avoid showing anything while determining if a campaign exists
    }

    if (!campaign) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleDecline}>
            <DialogContent className="w-[92%] sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl bg-gradient-to-b from-white to-slate-50 rounded-2xl">
                <div className="relative w-full h-48 sm:h-56 bg-muted">
                    <Image 
                        src={campaign.bannerImageUrl} 
                        alt={campaign.title} 
                        fill 
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 text-white">
                        <div className="bg-primary p-2 rounded-full shadow-lg">
                            <Gift className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold leading-tight drop-shadow-md text-white">
                            ¡Tienes un regalo de bienvenida!
                        </h2>
                    </div>
                </div>

                <div className="p-6">
                    <DialogHeader className="mb-4 text-left">
                        <DialogTitle className="text-xl font-bold text-slate-900 leading-tight">
                            ¡Sorpresa! Aquí tienes {campaign.title}
                        </DialogTitle>
                        <DialogDescription className="text-base text-slate-600 mt-2 leading-relaxed">
                            Para celebrar que ya eres parte de Biciregistro, <span className="font-semibold text-primary">{campaign.advertiserName}</span> tiene para ti este beneficio exclusivo y unico.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex-col sm:flex-col gap-3 sm:space-x-0 mt-6">
                        <Button 
                            onClick={handleAccept} 
                            disabled={actionLoading} 
                            className="w-full h-12 text-base font-bold shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90"
                        >
                            {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            ¡Reclamar mi regalo ahora!
                        </Button>
                        <Button 
                            variant="ghost" 
                            onClick={handleDecline} 
                            disabled={actionLoading}
                            className="w-full text-slate-400 hover:text-slate-600 font-medium"
                        >
                            No quiero el regalo, gracias
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
