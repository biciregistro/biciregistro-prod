'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ButtonProps } from '@/components/ui/button';
import { HeartPulse, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/lib/types';
import { getOrCreateEmergencyQr } from '@/lib/actions/emergency-actions';
import { cn } from '@/lib/utils';

interface DownloadStickerButtonProps extends ButtonProps {
  user: User;
}

export function DownloadEmergencyStickerButton({ user, className, ...props }: DownloadStickerButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleDownload = async () => {
    // 1. Validation
    const isComplete = user.bloodType && user.emergencyContactName && user.emergencyContactPhone;
    
    if (!isComplete) {
      toast({
        title: "Información Incompleta",
        description: "Por favor completa tu información de emergencia (Sangre y Contacto) para descargar la etiqueta.",
        variant: "destructive",
      });
      router.push('/dashboard/profile');
      return;
    }

    setLoading(true);
    try {
      // 2. Dynamic Imports to avoid loading heavy PDF libs on main dashboard
      const reactPdfModule = await import('@react-pdf/renderer');
      const emergencyStickerModule = await import('@/components/pdf/emergency-sticker');
      const qrcodeModule = await import('qrcode');

      const pdf = reactPdfModule.pdf;
      const EmergencyPDFDocument = emergencyStickerModule.EmergencyPDFDocument;
      // Handle different export styles for qrcode
      const toDataURL = qrcodeModule.toDataURL || (qrcodeModule as any).default?.toDataURL;

      if (!toDataURL) {
          throw new Error("Could not load QRCode library");
      }

      // 3. Ensure UUID exists
      let uuidToUse = user.emergencyQrUuid;
      if (!uuidToUse) {
        // If we need to create one, we use the server action
        uuidToUse = await getOrCreateEmergencyQr(user.id);
      }

      // 4. Generate QR Data URL
      const qrUrl = `${window.location.origin}/e/${uuidToUse}`;
      const qrDataUrl = await toDataURL(qrUrl, { 
        width: 300,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      });

      // 5. Generate PDF Blob
      // Note: We use the component variable directly in JSX
      const blob = await pdf(
        <EmergencyPDFDocument qrDataUrl={qrDataUrl} userName={`${user.name} ${user.lastName || ''}`} />
      ).toBlob();

      // 6. Trigger Download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Etiqueta-Emergencia-${user.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Etiqueta Generada",
        description: "Tu PDF se ha descargado correctamente.",
      });

    } catch (error) {
      console.error('Error generating sticker:', error);
      toast({
        title: "Error",
        description: "Hubo un problema al generar el PDF. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      id="tour-qr"
      className={cn("bg-red-600 hover:bg-red-700 text-white border-red-700", className)}
      onClick={handleDownload}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <HeartPulse className="mr-2 h-4 w-4" />
      )}
      Mi QR de emergencia
    </Button>
  );
}
