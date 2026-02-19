'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Campaign } from '@/lib/types';
import { getActiveCampaigns, recordCampaignConversion } from '@/lib/actions/campaign-actions';
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
import { Loader2, Download, ExternalLink } from 'lucide-react';

interface CampaignWithAdvertiser extends Campaign {
    advertiserName?: string;
}

export function PromotionalBanner() {
  const [campaign, setCampaign] = useState<CampaignWithAdvertiser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [consent, setConsent] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadCampaign() {
      try {
        const campaigns = await getActiveCampaigns('dashboard_main');
        if (campaigns.length > 0) {
          // Select the most recent one or rotate randomly if multiple
          setCampaign(campaigns[0] as CampaignWithAdvertiser);
        }
      } catch (error) {
        console.error('Failed to load banner:', error);
      } finally {
        setLoading(false);
      }
    }
    loadCampaign();
  }, []);

  const handleCtaClick = () => {
    setConsent(false); // Reset consent on open
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    if (!campaign) return;
    if (!consent) return;

    setIsProcessing(true);
    try {
      const consentText = `Acepto compartir mis datos con ${campaign.advertiserName || 'el aliado'}. He leído y estoy de acuerdo con los terminos y condiciones de uso y la politica de privacidad.`;
      
      const result = await recordCampaignConversion(campaign.id, {
          accepted: true,
          text: consentText
      });

      if (result?.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      // Success
      toast({
        title: "¡Listo!",
        description: campaign.type === 'download' 
            ? "Tu descarga comenzará en breve." 
            : "Redirigiendo...",
      });

      // Perform the action (Download or Redirect)
      if (campaign.assetUrl) {
          if (campaign.type === 'download') {
              window.open(campaign.assetUrl, '_blank');
          } else {
              window.open(campaign.assetUrl, '_blank');
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

  if (loading || !campaign) return null;

  return (
    <>
      {/* Banner Container */}
      <div className="w-full mb-6 relative group cursor-pointer overflow-hidden rounded-xl border shadow-sm hover:shadow-md transition-all" onClick={handleCtaClick}>
        {/* Responsive Image Handling */}
        <div className="relative w-full aspect-[3/1] md:aspect-[4/1] bg-gray-100">
             {/* Fallback to regular banner if mobile not present */}
             <Image 
                src={campaign.bannerImageUrl} 
                alt={campaign.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1200px"
                priority
             />
        </div>
      </div>

      {/* Consent Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
                {campaign.type === 'download' ? 'Descargar Contenido' : 'Ir al sitio del aliado'}
            </DialogTitle>
            <DialogDescription>
              Estás a un clic de acceder a <strong>{campaign.title}</strong>.
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
                        Acepto compartir mis datos con <strong>{campaign.advertiserName || 'el aliado'}</strong>. He leído y estoy de acuerdo con los terminos y condiciones de uso y la politica de privacidad.
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
              {campaign.type === 'download' ? (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar
                  </>
              ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ir al sitio
                  </>
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
