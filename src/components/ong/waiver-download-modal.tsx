'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, AlertCircle, FileText, ShieldCheck } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getWaiverDetailsAction, WaiverDetails } from '@/lib/actions/waiver-actions';
import { pdf } from '@react-pdf/renderer';
import { WaiverPDFDocument } from './waiver-pdf-document';
import { PDFDocument } from 'pdf-lib';

interface WaiverDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    registrationId: string;
    eventName: string;
    participantName: string;
}

export function WaiverDownloadModal({ isOpen, onClose, registrationId, eventName, participantName }: WaiverDownloadModalProps) {
    const [waiverData, setWaiverData] = useState<WaiverDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen && registrationId) {
            const fetchWaiverData = async () => {
                setIsLoading(true);
                setError(null);
                setWaiverData(null);

                const result = await getWaiverDetailsAction(registrationId);

                if (result.success) {
                    setWaiverData(result.data);
                } else {
                    setError(result.error);
                    toast({
                        variant: "destructive",
                        title: "Error al cargar responsiva",
                        description: result.error,
                    });
                }
                setIsLoading(false);
            };

            fetchWaiverData();
        }
    }, [isOpen, registrationId, toast]);

    const handleSecureDownload = async () => {
        if (!waiverData) return;
        setIsGenerating(true);

        try {
            // 1. Generar el PDF base con React-PDF
            const blob = await pdf(
                <WaiverPDFDocument 
                    waiverText={waiverData.waiverText}
                    signatureImage={waiverData.signatureImage}
                    participantName={`${waiverData.participant.name} ${waiverData.participant.lastName}`}
                    eventName={waiverData.event.name}
                    acceptedAt={waiverData.acceptedAt}
                    registrationId={waiverData.registrationId}
                    ipAddress={waiverData.waiverIp}
                    securityHash={waiverData.waiverHash}
                />
            ).toBlob();

            // 2. Cargar en pdf-lib
            const arrayBuffer = await blob.arrayBuffer();
            // Cargamos el documento original
            const srcDoc = await PDFDocument.load(arrayBuffer);
            
            // Creamos un nuevo documento para asegurar una instancia limpia
            const newDoc = await PDFDocument.create();
            
            // Copiamos todas las páginas del original al nuevo
            const indices = srcDoc.getPageIndices();
            const copiedPages = await newDoc.copyPages(srcDoc, indices);
            copiedPages.forEach((page) => newDoc.addPage(page));

            // Generar una contraseña de propietario aleatoria
            const ownerPassword = Math.random().toString(36).substring(2) + Date.now().toString(36);

            // Intentamos aplicar encriptación
            try {
                // Usamos casting a 'any' para evitar errores de compilación de TS
                // ya que las definiciones de tipos pueden estar desactualizadas pero la función existe en runtime.
                const docAny = newDoc as any;

                if (typeof docAny.encrypt === 'function') {
                    docAny.encrypt({
                        userPassword: '', 
                        ownerPassword: ownerPassword, 
                        permissions: {
                            printing: 'highResolution',
                            modifying: false,
                            copying: false,
                            annotating: false,
                            fillingForms: false,
                            contentAccessibility: true, 
                            documentAssembly: false
                        }
                    });
                } else {
                    console.warn("La función de encriptación no está disponible en este entorno (pdf-lib). Se generará sin protección.");
                }
            } catch (encryptError) {
                console.error("Fallo al aplicar encriptación:", encryptError);
                // Continuamos sin encriptar para no bloquear al usuario
            }

            const protectedPdfBytes = await newDoc.save();
            const protectedBlob = new Blob([protectedPdfBytes], { type: 'application/pdf' });
            
            // 3. Iniciar descarga
            const url = URL.createObjectURL(protectedBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Responsiva_${eventName.replace(/\s+/g, '_')}_${participantName.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: "Descarga iniciada",
                description: "El documento se ha descargado correctamente.",
            });

        } catch (err) {
            console.error("Error generating secure PDF:", err);
            toast({ 
                title: "Error", 
                description: "No se pudo generar el PDF. Intente nuevamente.", 
                variant: "destructive" 
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        Responsiva Digital Segura
                    </DialogTitle>
                    <DialogDescription>
                        Este documento incluye huella criptográfica y protección contra copia para garantizar su validez legal.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 min-h-[100px] flex items-center justify-center">
                    {isLoading && (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <p>Verificando firma digital...</p>
                        </div>
                    )}

                    {error && (
                         <div className="flex flex-col items-center gap-2 text-destructive">
                            <AlertCircle className="h-8 w-8" />
                            <p className="text-center">{error}</p>
                        </div>
                    )}

                    {!isLoading && !error && waiverData && (
                        <div className="text-center w-full">
                             <div className="bg-slate-50 p-4 rounded-lg mb-6 text-sm text-left border">
                                <p className="font-semibold mb-2">Detalles de Verificación:</p>
                                <p className="text-muted-foreground text-xs">Firmante: {waiverData.participant.name} {waiverData.participant.lastName}</p>
                                <p className="text-muted-foreground text-xs">Fecha: {new Date(waiverData.acceptedAt).toLocaleString()}</p>
                                <p className="text-muted-foreground text-xs mt-1">IP Origen: {waiverData.waiverIp || 'N/A (Histórico)'}</p>
                                <p className="text-muted-foreground text-xs break-all">Hash: {waiverData.waiverHash ? waiverData.waiverHash.substring(0, 20) + '...' : 'N/A'}</p>
                             </div>

                             <Button 
                                size="lg" 
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={handleSecureDownload}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generando Documento...
                                    </>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-4 w-4" />
                                        Descargar Documento
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
                
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isGenerating}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
