'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Eraser, PenTool } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import dynamic from 'next/dynamic';
import { Checkbox } from "@/components/ui/checkbox";
import SignatureCanvas from 'react-signature-canvas';

import { DEFAULT_WAIVER_TEXT, TUTOR_WAIVER_TEXT } from "@/lib/legal-constants";

// Importación dinámica para evitar problemas de SSR con el canvas
const SignatureCanvasNoSSR = dynamic(
    () => import('react-signature-canvas').then(mod => {
        const SigCanvas = mod.default;
        // Se crea un componente wrapper que puede recibir una ref y pasarla al SignatureCanvas.
        const component = (props: React.ComponentProps<typeof SignatureCanvas>, ref: React.Ref<SignatureCanvas>) => (
            <SigCanvas {...props} ref={ref} />
        );
        component.displayName = "SignatureCanvasWrapper";
        return React.forwardRef(component);
    }),
    {
        ssr: false,
        loading: () => <div className="w-full h-40 bg-muted/20 animate-pulse rounded-lg flex items-center justify-center text-muted-foreground text-xs">Cargando lienzo de firma...</div>
    }
);

interface WaiverModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (signatureDataUrl: string, signedText: string) => void;
    waiverText: string;
    participantName: string;
    eventName: string;
    organizerName: string;
    isPending?: boolean;
    isTutor?: boolean;
    tutorName?: string;
}

export function WaiverModal({
    isOpen,
    onClose,
    onConfirm,
    waiverText,
    participantName,
    eventName,
    organizerName,
    isPending = false,
    isTutor = false,
    tutorName = ""
}: WaiverModalProps) {
    const [processedText, setProcessedText] = useState("");
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);
    const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
    const sigCanvas = useRef<SignatureCanvas>(null);
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Determina el texto base a utilizar
    const baseText = isTutor ? TUTOR_WAIVER_TEXT : waiverText || DEFAULT_WAIVER_TEXT;

    // Procesar texto: Reemplazar variables
    useEffect(() => {
        let text = baseText;
        // Reemplazos comunes
        text = text.replace(/\[NOMBRE DEL PARTICIPANTE\]/g, participantName);
        text = text.replace(/\[NOMBRE DEL EVENTO\]/g, eventName);
        text = text.replace(/\[NOMBRE DEL ORGANIZADOR \/ RAZÓN SOCIAL\]/g, organizerName);
        text = text.replace(/\[NOMBRE DEL ORGANIZADOR\]/g, organizerName); // Fallback

        // Reemplazo específico para tutor
        if (isTutor && tutorName) {
            text = text.replace(/\[NOMBRE DEL TUTOR\]/g, tutorName);
        }
        
        setProcessedText(text);
    }, [baseText, participantName, eventName, organizerName, isTutor, tutorName]);

    // Resetear el scroll y estados cuando se abre el modal
    useEffect(() => {
        if (isOpen) {
            setHasScrolledToBottom(false);
            setIsSignatureEmpty(true);
            setHasAcceptedTerms(false);
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
        if (sigCanvas.current && sigCanvas.current.clear) {
            sigCanvas.current.clear();
        }
        setIsSignatureEmpty(true);
    };

    const handleEndDrawing = () => {
        if (sigCanvas.current && sigCanvas.current.isEmpty) {
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

        if (isTutor && !hasAcceptedTerms) {
            toast({
                variant: "destructive",
                title: "Confirmación Requerida",
                description: "Debes aceptar los términos en nombre del menor para continuar.",
            });
            return;
        }

        // Obtener la imagen en base64
        if (sigCanvas.current && sigCanvas.current.getTrimmedCanvas) {
            const signatureData = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
            if (signatureData) {
                onConfirm(signatureData, processedText);
            }
        }
    };

    const isConfirmButtonDisabled = !hasScrolledToBottom || isSignatureEmpty || isPending || (isTutor && !hasAcceptedTerms);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Carta Responsiva</DialogTitle>
                    <DialogDescription>
                        {isTutor 
                            ? `Estás inscribiendo a ${participantName}. Como tutor, lee cuidadosamente el documento y fírmalo para completar el registro.`
                            : "Por favor lee cuidadosamente el siguiente documento y fírmalo para completar tu registro."
                        }
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
                            {/* Pass a function to capture the internal component instance */}
                            <SignatureCanvasNoSSR 
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
                        
                        {isTutor && tutorName ? (
                            <div className="text-xs text-muted-foreground text-center space-y-2 pt-2">
                                <div className="items-top flex space-x-2.5 text-left p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-900/20 dark:border-blue-800">
                                    <Checkbox 
                                        id="terms-minor" 
                                        className="mt-0.5 border-blue-400"
                                        checked={hasAcceptedTerms}
                                        onCheckedChange={(checked) => setHasAcceptedTerms(Boolean(checked))}
                                        disabled={!hasScrolledToBottom}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <label
                                            htmlFor="terms-minor"
                                            className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-blue-800 dark:text-blue-300"
                                        >
                                            Declaro bajo protesta de decir verdad ser el padre, madre o tutor legal del menor inscrito y acepto la carta responsiva en su nombre y representación.
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    Firmado por: <span className="font-semibold text-foreground">{tutorName}</span> (Tutor de <span className="font-semibold text-foreground">{participantName}</span>)
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground text-center">
                                Firmado por: <span className="font-semibold text-foreground">{participantName}</span>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2 bg-muted/10 border-t">
                    <Button variant="outline" onClick={onClose} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={isConfirmButtonDisabled}
                        className={!isConfirmButtonDisabled ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                        {isPending ? "Procesando..." : "Aceptar y Firmar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
