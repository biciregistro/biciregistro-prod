'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, AlertCircle, FileText } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getWaiverDetailsAction, WaiverDetails } from '@/lib/actions/waiver-actions';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { WaiverPDFDocument } from './waiver-pdf-document';

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

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Responsiva Firmada
                    </DialogTitle>
                    <DialogDescription>
                        Visualiza y descarga el documento PDF firmado por {participantName}.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 min-h-[100px] flex items-center justify-center">
                    {isLoading && (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <p>Cargando datos...</p>
                        </div>
                    )}

                    {error && (
                         <div className="flex flex-col items-center gap-2 text-destructive">
                            <AlertCircle className="h-8 w-8" />
                            <p className="text-center">{error}</p>
                        </div>
                    )}

                    {waiverData && (
                        <div className="text-center">
                             <p className="mb-4">El documento está listo para ser descargado.</p>
                            <PDFDownloadLink
                                document={
                                    <WaiverPDFDocument 
                                        waiverText={waiverData.waiverText}
                                        signatureImage={waiverData.signatureImage}
                                        participantName={`${waiverData.participant.name} ${waiverData.participant.lastName}`}
                                        eventName={waiverData.event.name}
                                        acceptedAt={waiverData.acceptedAt}
                                        registrationId={waiverData.registrationId}
                                    />
                                }
                                fileName={`Responsiva_${eventName.replace(/\s+/g, '_')}_${participantName.replace(/\s+/g, '_')}.pdf`}
                            >
                                {({ blob, url, loading, error }) => 
                                    loading ? (
                                        <Button size="lg" disabled>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generando PDF...
                                        </Button>
                                    ) : (
                                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                                            <Download className="mr-2 h-4 w-4" />
                                            Descargar PDF
                                        </Button>
                                    )
                                }
                            </PDFDownloadLink>
                        </div>
                    )}
                </div>
                
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
