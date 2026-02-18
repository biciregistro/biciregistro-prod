'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Campaign } from '@/lib/types';
import { getActiveCampaigns, recordCampaignConversion } from '@/lib/actions/campaign-actions';
import { Button } from '@/components/ui/button';
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

export function PromotionalBanner() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadCampaign() {
      try {
        const campaigns = await getActiveCampaigns('dashboard_main');
        if (campaigns.length > 0) {
          // Select the most recent one or rotate randomly if multiple
          setCampaign(campaigns[0]);
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
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    if (!campaign) return;

    setIsProcessing(true);
    try {
      const result = await recordCampaignConversion(campaign.id);

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
              // Create a temporary link to force download if needed, or just open in new tab
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
        
        {/* Overlay CTA (Optional, depending on design) */}
        {/* <div className="absolute bottom-4 right-4">
            <Button variant="secondary" size="sm">
                {campaign.type === 'download' ? 'Descargar Ahora' : 'Ver Más'}
            </Button>
        </div> */}
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
          
          <div className="py-4 text-sm text-gray-600 space-y-2">
            <p>
                Al continuar, aceptas compartir tu <strong>nombre y correo electrónico</strong> con el aliado que patrocina este contenido.
            </p>
            <p className="text-xs text-gray-500">
                Tus datos serán utilizados únicamente con fines informativos y comerciales relacionados con esta campaña. 
                TotalBike actúa como intermediario tecnológico y no se hace responsable del contenido de terceros.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {campaign.type === 'download' ? (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Aceptar y Descargar
                  </>
              ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Aceptar e Ir
                  </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
