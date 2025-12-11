'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Eraser, PenTool } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import dynamic from 'next/dynamic';

// Importación dinámica para evitar problemas de SSR con el canvas
const SignatureCanvas = dynamic(() => import('react-signature-canvas'), {
    ssr: false,
    loading: () => <div className="w-full h-40 bg-muted/20 animate-pulse rounded-lg flex items-center justify-center text-muted-foreground text-xs">Cargando lienzo de firma...</div>
});

interface WaiverModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (signatureDataUrl: string, signedText: string) => void;
    waiverText: string;
    participantName: string;
    eventName: string;
    organizerName: string;
    isPending?: boolean;
}

export function WaiverModal({
    isOpen,
    onClose,
    onConfirm,
    waiverText,
    participantName,
    eventName,
    organizerName,
    isPending = false
}: WaiverModalProps) {
    const [processedText, setProcessedText] = useState("");
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);
    // Usamos any para la ref porque el tipo de SignatureCanvas importado dinámicamente puede ser complejo
    const sigCanvas = useRef<any>(null);
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Procesar texto: Reemplazar variables
    useEffect(() => {
        let text = waiverText || "";
        // Usar replace con expresión regular global para reemplazar todas las ocurrencias
        text = text.replace(/\[NOMBRE DEL PARTICIPANTE\]/g, participantName);
        text = text.replace(/\[NOMBRE DEL EVENTO\]/g, eventName);
        text = text.replace(/\[NOMBRE DEL ORGANIZADOR \/ RAZÓN SOCIAL\]/g, organizerName);
        // Fallback por si el organizador usó nombres cortos
        text = text.replace(/\[NOMBRE DEL ORGANIZADOR\]/g, organizerName);
        
        setProcessedText(text);
    }, [waiverText, participantName, eventName, organizerName]);

    // Resetear el scroll cuando se abre el modal
    useEffect(() => {
        if (isOpen) {
            setHasScrolledToBottom(false);
            setIsSignatureEmpty(true);
            if (scrollViewportRef.current) {
                scrollViewportRef.current.scrollTop = 0;
            }
        }
    }, [isOpen]);

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
        // Tolerancia de 5px. Si el texto es corto y no hay scroll, se considera leído.
        if (scrollHeight <= clientHeight || scrollHeight - scrollTop - clientHeight < 5) {
            setHasScrolledToBottom(true);
        }
    };

    // Verificar si el contenido cabe sin scroll al montar o cambiar texto
    useEffect(() => {
        if (scrollViewportRef.current) {
            const { scrollHeight, clientHeight } = scrollViewportRef.current;
            if (scrollHeight <= clientHeight) {
                setHasScrolledToBottom(true);
            }
        }
    }, [processedText, isOpen]);

    const clearSignature = () => {
        sigCanvas.current?.clear();
        setIsSignatureEmpty(true);
    };

    const handleEndDrawing = () => {
        if (sigCanvas.current) {
            setIsSignatureEmpty(sigCanvas.current.isEmpty());
        }
    };

    const handleConfirm = () => {
        if (isSignatureEmpty) {
            toast({
                variant: "destructive",
                title: "Firma requerida",
                description: "Por favor firma en el recuadro para continuar.",
            });
            return;
        }

        if (!hasScrolledToBottom) {
             toast({
                variant: "destructive",
                title: "Lectura requerida",
                description: "Por favor lee todo el documento (haz scroll hasta el final) antes de aceptar.",
            });
            return;
        }

        // Obtener la imagen en base64
        const signatureData = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
        if (signatureData) {
            onConfirm(signatureData, processedText);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Carta Responsiva</DialogTitle>
                    <DialogDescription>
                        Por favor lee cuidadosamente el siguiente documento y fírmalo para completar tu registro.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-6 pt-2 pb-2 flex flex-col gap-4">
                    {/* Contenedor del Texto Legal con Scroll */}
                    <div 
                        className="border rounded-md bg-muted/30 p-4 overflow-y-auto max-h-[40vh] text-sm font-mono leading-relaxed shadow-inner"
                        onScroll={handleScroll}
                        ref={scrollViewportRef}
                    >
                        <div className="whitespace-pre-wrap">
                            {processedText}
                        </div>
                    </div>

                    {!hasScrolledToBottom && (
                        <div className="text-center text-xs text-amber-600 animate-pulse font-medium flex items-center justify-center gap-2">
                            <AlertCircle className="w-3 h-3" />
                            Haz scroll hasta el final del texto para habilitar la firma
                        </div>
                    )}

                    {/* Área de Firma */}
                    <div className={`space-y-2 transition-opacity duration-500 ${hasScrolledToBottom ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <div className="flex justify-between items-end">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <PenTool className="w-4 h-4" /> Tu Firma
                            </label>
                            <Button variant="ghost" size="sm" onClick={clearSignature} className="h-6 text-xs text-muted-foreground hover:text-destructive">
                                <Eraser className="w-3 h-3 mr-1" /> Limpiar
                            </Button>
                        </div>
                        
                        <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white relative overflow-hidden touch-none h-40">
                            <SignatureCanvas 
                                ref={sigCanvas}
                                penColor="black"
                                canvasProps={{
                                    className: "w-full h-full cursor-crosshair"
                                }}
                                onEnd={handleEndDrawing}
                            />
                            {isSignatureEmpty && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/30 text-lg select-none">
                                    Dibuja tu firma aquí
                                </div>
                            )}
                        </div>
                        
                        <div className="text-xs text-muted-foreground text-center">
                            Firmado por: <span className="font-semibold text-foreground">{participantName}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2 bg-muted/10 border-t">
                    <Button variant="outline" onClick={onClose} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={!hasScrolledToBottom || isSignatureEmpty || isPending}
                        className={hasScrolledToBottom && !isSignatureEmpty ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                        {isPending ? "Procesando..." : "Aceptar y Firmar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
