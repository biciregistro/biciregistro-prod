'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Campaign, CampaignPlacement } from '@/lib/types';
import { getActiveCampaigns, recordCampaignConversion } from '@/lib/actions/campaign-actions';
import { purchaseReward } from '@/lib/actions/reward-actions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, ExternalLink, Ticket } from 'lucide-react';
import { useGamificationToast } from '@/hooks/use-gamification-toast';

interface CampaignWithAdvertiser extends Campaign {
    advertiserName?: string;
}

interface PromotionalBannerProps {
    placement?: CampaignPlacement; // Made dynamic to receive the exact context placement
    userCountry?: string;
    userState?: string;
}

export function PromotionalBanner({ placement = 'dashboard_main', userCountry, userState }: PromotionalBannerProps) {
  const [campaigns, setCampaigns] = useState<CampaignWithAdvertiser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithAdvertiser | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [consent, setConsent] = useState(false);
  
  const { toast } = useToast();
  const { showRewardToast } = useGamificationToast();

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const activeCampaigns = await getActiveCampaigns(placement, userCountry, userState);
        setCampaigns(activeCampaigns as CampaignWithAdvertiser[]);
      } catch (error) {
        console.error(`Failed to load banner for placement ${placement}:`, error);
      } finally {
        setLoading(false);
      }
    }
    loadCampaigns();
  }, [userCountry, userState, placement]);

  const handleCtaClick = (campaign: CampaignWithAdvertiser) => {
    setSelectedCampaign(campaign);
    setConsent(false);
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedCampaign) return;
    if (!consent) return;

    setIsProcessing(true);
    try {
      const consentText = `Acepto compartir mis datos con ${selectedCampaign.advertiserName || 'el aliado'}. He leído y estoy de acuerdo con los terminos y condiciones de uso y la politica de privacidad.`;
      
      let result;

      // Handle 'coupon' type specifically
      if (selectedCampaign.type === 'coupon') {
          result = await purchaseReward(selectedCampaign.id, { accepted: true, text: consentText });
      } else {
          result = await recordCampaignConversion(selectedCampaign.id, { accepted: true, text: consentText }) as any;
      }

      if (result?.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      // Handle success messaging
      if (selectedCampaign.type === 'coupon') {
          toast({ 
              title: "¡Cupón adquirido!", 
              description: "El cupón se ha guardado en 'Mis Beneficios'. Revisa tu correo." 
          });
      } else {
          // Gamification for normal leads/clicks
          if (result.pointsAwarded && result.pointsAwarded > 0) {
              showRewardToast(result.pointsAwarded, `¡Beneficio desbloqueado! Gracias por participar en la campaña de ${selectedCampaign.advertiserName}.`);
          } else {
              toast({ title: "¡Éxito!", description: "Tu solicitud ha sido procesada." });
          }

          // Perform external redirect/download
          if (selectedCampaign.targetUrl) {
              // Corrección Quirúrgica: Asegurar que el targetUrl tiene http:// o https://
              let finalUrl = selectedCampaign.targetUrl;
              if (!/^https?:\/\//i.test(finalUrl)) {
                  finalUrl = `https://${finalUrl}`;
              }
              window.open(finalUrl, '_blank');
          }
      }

      setIsModalOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No pudimos procesar tu solicitud. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || campaigns.length === 0) return null;

  return (
    <>
      <div className="w-full mb-6">
          {/* Scroll container snap-x */}
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              {campaigns.map((campaign) => (
                   <div 
                        key={campaign.id}
                        className="relative group cursor-pointer overflow-hidden rounded-xl border shadow-sm hover:shadow-md transition-all shrink-0 snap-center w-[90%] md:w-[85%]" 
                        onClick={() => handleCtaClick(campaign)}
                    >
                        <div className="relative w-full aspect-[3/1] md:aspect-[4/1] bg-gray-100">
                             {campaign.bannerImageUrl ? (
                                 <Image 
                                    src={campaign.bannerImageUrl} 
                                    alt={campaign.title}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 90vw, (max-width: 1200px) 85vw, 1000px"
                                    priority
                                 />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                     <span className="text-gray-400">Sin imagen</span>
                                 </div>
                             )}
                        </div>
                   </div>
              ))}
          </div>
      </div>

      {/* Reusable Dialog for the selected campaign */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
                {selectedCampaign?.type === 'download' ? 'Descargar Contenido' : 
                 selectedCampaign?.type === 'coupon' ? 'Obtener Cupón' : 
                 'Ir al sitio del aliado'}
            </DialogTitle>
            <DialogDescription>
              Estás a un clic de {selectedCampaign?.type === 'coupon' ? 'adquirir' : 'acceder a'} <strong>{selectedCampaign?.title}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex items-start space-x-3 p-4 border rounded-md bg-muted/20">
                <Checkbox 
                    id="consent" 
                    checked={consent} 
                    onCheckedChange={(checked) => setConsent(checked as boolean)} 
                    className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                    <Label
                        htmlFor="consent"
                        className="text-sm text-muted-foreground text-justify font-normal cursor-pointer leading-relaxed"
                    >
                        Acepto compartir mis datos con <strong>{selectedCampaign?.advertiserName || 'el aliado'}</strong>. He leído y estoy de acuerdo con los terminos y condiciones de uso y la politica de privacidad.
                    </Label>
                </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isProcessing} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={isProcessing || !consent} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedCampaign?.type === 'download' ? (
                  <><Download className="mr-2 h-4 w-4" /> Descargar</>
              ) : selectedCampaign?.type === 'coupon' ? (
                  <><Ticket className="mr-2 h-4 w-4" /> Obtener Cupón</>
              ) : (
                  <><ExternalLink className="mr-2 h-4 w-4" /> Ir al sitio</>
              )}
            </Button>
          </DialogFooter>

          <div className="pt-2 text-center">
             <p className="text-xs text-gray-400">
                Biciregistro actúa como intermediario tecnológico y no se hace responsable del contenido de terceros.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
