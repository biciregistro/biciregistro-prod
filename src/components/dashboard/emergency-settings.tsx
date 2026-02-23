'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle, FileDown, Loader2, RefreshCw } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { EmergencyPDFDocument } from '@/components/pdf/emergency-sticker';
import { getOrCreateEmergencyQr, regenerateEmergencyQr } from '@/lib/actions/emergency-actions';
import { User } from '@/lib/types';
import QRCode from 'qrcode';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface EmergencyFormProps {
  user: User;
}

export default function EmergencySettings({ user }: EmergencyFormProps) {
  const [loading, setLoading] = useState(false);
  const [currentUuid, setCurrentUuid] = useState<string | null>(user.emergencyQrUuid || null);
  const { toast } = useToast();

  const generateAndDownload = async () => {
    setLoading(true);
    try {
      // 1. Ensure UUID exists
      let uuidToUse = currentUuid;
      if (!uuidToUse) {
        uuidToUse = await getOrCreateEmergencyQr(user.id);
        setCurrentUuid(uuidToUse);
      }

      // 2. Generate QR Data URL using qrcode library
      const qrUrl = `${window.location.origin}/e/${uuidToUse}`;
      
      const qrDataUrl = await QRCode.toDataURL(qrUrl, { 
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      // 3. Generate PDF Blob
      const blob = await pdf(
        <EmergencyPDFDocument qrDataUrl={qrDataUrl} userName={`${user.name} ${user.lastName || ''}`} />
      ).toBlob();

      // 4. Trigger Download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Etiqueta-Emergencia-${user.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "PDF Generado",
        description: "Tu etiqueta se ha descargado correctamente.",
      });

    } catch (error) {
      console.error('Error generating sticker:', error);
      toast({
        title: "Error",
        description: "Hubo un error al generar el PDF. Por favor intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
        const newUuid = await regenerateEmergencyQr(user.id);
        setCurrentUuid(newUuid);
        toast({
            title: "Código Regenerado",
            description: "El código anterior ha sido invalidado. Por favor imprime tu nueva etiqueta.",
        });
    } catch(e) {
        console.error(e);
        toast({
            title: "Error",
            description: "No se pudo regenerar el código. Intenta más tarde.",
            variant: "destructive"
        });
    } finally {
        setLoading(false);
    }
  };

  const hasIncompleteData = !user.bloodType || !user.emergencyContactName || !user.emergencyContactPhone;

  return (
    <Card className="border-l-4 border-l-red-500 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-100 rounded-full">
              <FileDown className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle>Etiqueta de Emergencia Inteligente</CardTitle>
              <CardDescription>
                Descarga tu sticker de seguridad (5x5cm) para tu casco o bicicleta.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            
            {hasIncompleteData && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                      <p className="font-bold mb-1">Información Incompleta</p>
                      <p>
                          Para que la etiqueta sea útil, necesitamos que completes tu <strong>Tipo de Sangre</strong> y <strong>Contacto de Emergencia</strong> en el formulario de abajo.
                      </p>
                  </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs text-gray-500 uppercase">Datos a mostrar</Label>
                    <div className="p-3 bg-gray-50 rounded-lg border text-sm space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Sangre:</span>
                            <span className="font-medium">{user.bloodType || "---"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Alergias:</span>
                            <span className="font-medium truncate max-w-[150px]">{user.allergies || "Ninguna"}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1">
                            <span className="text-gray-500">Contacto:</span>
                            <span className="font-medium">{user.emergencyContactName || "---"}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col justify-end gap-3">
                    <Button 
                      onClick={generateAndDownload} 
                      disabled={loading || hasIncompleteData} 
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        Descargar PDF
                    </Button>
                    
                    {currentUuid && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  disabled={loading} 
                                  className="w-full text-gray-500 hover:text-red-600 text-xs"
                                >
                                    <RefreshCw className="mr-2 h-3 w-3" />
                                    Regenerar código (Invalidar anterior)
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción invalidará tu código QR actual inmediatamente.
                                        Cualquier etiqueta impresa dejará de funcionar y tendrás que imprimir una nueva.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleRegenerate} className="bg-red-600 hover:bg-red-700">
                                        Sí, invalidar y regenerar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
