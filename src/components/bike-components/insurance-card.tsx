'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Bike, InsuranceRequest, User } from '@/lib/types';
import { createInsuranceRequest, approveQuote, rejectQuote, uploadPolicyUrl } from '@/lib/actions/insurance-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, FileText, CheckCircle, XCircle, ExternalLink, Upload, AlertCircle, Phone, Download } from 'lucide-react';
import Link from 'next/link';
import { ImageUpload } from '@/components/shared/image-upload';
import { cn } from '@/lib/utils';

interface InsuranceCardProps {
    bike: Bike;
    user: User;
    insuranceRequest: InsuranceRequest | null;
}

export function InsuranceCard({ bike, user, insuranceRequest }: InsuranceCardProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    
    // Derived state
    const hasOwnershipProof = !!bike.ownershipProof;
    const status = insuranceRequest?.status;

    const handleRequestQuote = () => {
        if (!termsAccepted) return;
        
        // Prioritize phone, then whatsapp
        const contactPhone = user.phone || user.whatsapp || '';

        startTransition(async () => {
            try {
                const result = await createInsuranceRequest(
                    bike.id,
                    contactPhone,
                    user.email,
                    {
                        brand: bike.make,
                        model: bike.model,
                        color: bike.color,
                        year: bike.modelYear || ''
                    }
                );
                
                if (result.success) {
                    toast({ title: "Solicitud enviada", description: "Tu cotización se está generando." });
                    setIsModalOpen(false);
                } else {
                     toast({ title: "Error", description: result.message || "Error al solicitar cotización", variant: "destructive" });
                }
            } catch (error) {
                toast({ title: "Error", description: "Ocurrió un error inesperado.", variant: "destructive" });
            }
        });
    };

    const handleApprove = () => {
        if (!insuranceRequest) return;
        startTransition(async () => {
             await approveQuote(insuranceRequest.id);
             toast({ title: "Cotización Aprobada", description: "Recibirás el link de pago pronto." });
        });
    };

    const handleReject = () => {
        if (!insuranceRequest) return;
         startTransition(async () => {
             await rejectQuote(insuranceRequest.id);
             toast({ title: "Cotización Rechazada", description: "Esperamos poder asegurarte en el futuro." });
        });
    };

    const handlePolicyUpload = (url: string) => {
         if (!insuranceRequest) return;
         startTransition(async () => {
             await uploadPolicyUrl(insuranceRequest.id, url);
             toast({ title: "Póliza Subida", description: "Tu seguro está activo y documentado." });
        });
    };

    // --- Renders for different states ---

    if (status === 'PAID' && insuranceRequest) {
        return (
            <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                <CardHeader>
                    <CardTitle className="text-green-800 dark:text-green-300 flex items-center gap-2">
                        <ShieldCheck className="h-6 w-6" />
                        Bicicleta Asegurada con Clupp
                    </CardTitle>
                    <CardDescription className="text-green-700 dark:text-green-400">
                         Recibirás en tu correo electrónico tu usuario y contraseña para acceder a la app de Clupp y completar el proceso.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {insuranceRequest.policyUrl ? (
                        <Button variant="outline" className="w-full bg-white dark:bg-transparent" asChild>
                            <a href={insuranceRequest.policyUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="mr-2 h-4 w-4" />
                                Descargar Póliza
                            </a>
                        </Button>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Sube tu póliza aquí:</p>
                             <ImageUpload 
                                onUploadSuccess={handlePolicyUpload} 
                                storagePath={`insurance-policies/${bike.id}`} 
                                disabled={isPending}
                             />
                        </div>
                    )}

                    <div className="pt-2 flex flex-col gap-2">
                        <Button variant="secondary" className="w-full" asChild>
                            <a href="https://clupp.com.mx/" target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Abrir App de Clupp
                            </a>
                        </Button>
                        
                         <Button variant="link" className="w-full h-auto p-0 text-sm text-green-800" asChild>
                            <a href="https://clupp.com.mx/blog/como-reportar-un-siniestro-en-clupp-y-que-hacer-en-caso-de-accidente/" target="_blank">
                                Qué hacer en caso de siniestro
                            </a>
                        </Button>

                         <Button variant="destructive" className="w-full h-12 text-lg font-bold shadow-md" asChild>
                            <a href="tel:+525592252185">
                                <Phone className="mr-2 h-5 w-5" />
                                SOS Reportar Siniestro
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    // Status: QUOTED, PENDING, APPROVED, PAYMENT_LINK_SENT, REJECTED, or NULL (New)

    return (
        <Card className={cn("border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900", 
            status === 'REJECTED' && "bg-gray-50 border-gray-200 dark:bg-gray-900/10 dark:border-gray-800"
        )}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Tu seguro de Bicicleta
                </CardTitle>
                <CardDescription>
                    Protege tu rodada con la cobertura integral de Clupp.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!status && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Solicita una cotización personalizada para asegurar tu bicicleta contra robo, daños y responsabilidad civil.
                        </p>
                        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                            <DialogTrigger asChild>
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                    Asegurar Bicicleta con Clupp
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Asegura tu bici con Clupp</DialogTitle>
                                    <DialogDescription>
                                        Al contratar tu seguro obtendrás:
                                    </DialogDescription>
                                </DialogHeader>
                                
                                {hasOwnershipProof ? (
                                    <div className="space-y-4 py-4">
                                        <ul className="list-disc list-inside space-y-1 text-sm">
                                            <li>Cobertura de daños</li>
                                            <li>Cobertura por robo</li>
                                            <li>Cobertura de gastos médicos</li>
                                            <li>Cobertura de daños a terceros</li>
                                        </ul>
                                        
                                        <div className="flex items-start space-x-2 pt-2">
                                            <Checkbox 
                                                id="terms" 
                                                checked={termsAccepted} 
                                                onCheckedChange={(c) => setTermsAccepted(!!c)} 
                                            />
                                            <label
                                                htmlFor="terms"
                                                className="text-xs text-muted-foreground leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                Al hacer clic en 'Cotizar Seguro', autorizo a BICIREGISTRO a compartir mi nombre, correo electrónico y datos de mi bicicleta con Clupp (Clupp Mutualidad, S.C. de R.L. de C.V.) exclusivamente con la finalidad de generar una cotización de movilidad. Entiendo que la contratación del seguro será un acuerdo directo entre Clupp y mi persona.
                                            </label>
                                        </div>

                                        <Button 
                                            onClick={handleRequestQuote} 
                                            disabled={!termsAccepted || isPending}
                                            className="w-full mt-4"
                                        >
                                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Cotizar Seguro
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 py-4 text-center">
                                        <AlertCircle className="h-10 w-10 text-yellow-500 mx-auto" />
                                        <p className="font-medium">Documento Requerido</p>
                                        <p className="text-sm text-muted-foreground">
                                            Para contratar tu seguro debes de contar con la factura de compra de tu bicicleta.
                                        </p>
                                        <Button onClick={() => {
                                            setIsModalOpen(false);
                                            // Scroll to ownership section or trigger focus logic
                                            const el = document.getElementById('tour-bike-ownership');
                                            el?.scrollIntoView({ behavior: 'smooth' });
                                        }} className="w-full">
                                            Cargar Factura
                                        </Button>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>
                    </div>
                )}

                {status === 'PENDING' && (
                    <div className="space-y-3">
                         <div className="flex justify-center items-center gap-2 text-sm text-blue-800 dark:text-blue-300 text-center">
                            <span className="font-medium">Estamos preparando tu cotización, recibirás un correo electronico en cuanto esté lista. Cuando la recibas regresa aqui para aceptarla y avanzar con tu contratación.</span>
                        </div>
                        <Button variant="outline" className="w-full" asChild>
                             <a href="https://clupp.com.mx/seguro-para-bicicleta/" target="_blank" rel="noopener noreferrer">
                                Conocer más de Clupp
                            </a>
                        </Button>
                    </div>
                )}

                {status === 'QUOTED' && (
                    <div className="space-y-3">
                         <p className="text-sm font-medium">Tu cotización ya se encuentra en tu correo electrónico.</p>
                         <div className="grid grid-cols-2 gap-2">
                             <Button onClick={handleApprove} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aprobar Cotización'}
                             </Button>
                             <Button onClick={handleReject} disabled={isPending} variant="secondary">
                                Rechazar
                             </Button>
                         </div>
                    </div>
                )}
                
                {status === 'APPROVED' && (
                     <div className="flex items-center justify-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium text-center">
                        <CheckCircle className="h-5 w-5 shrink-0" />
                        <span>Haz aprobado la cotización, en breve recibirás un correo de Clupp con el link y las instrucciones para realizar tu pago en el portal de Clupp.</span>
                    </div>
                )}

                {status === 'PAYMENT_LINK_SENT' && (
                     <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400 font-medium">
                            <CheckCircle className="h-5 w-5" />
                            <span>Tu liga de pago ha sido enviada a tu correo.</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Revisa tu bandeja de entrada (y spam) para completar el pago.</p>
                    </div>
                )}

                {status === 'REJECTED' && (
                    <div className="space-y-2">
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <XCircle className="h-5 w-5" />
                            <span>Cotización rechazada.</span>
                        </div>
                         <p className="text-xs text-muted-foreground">No olvides que siempre puedes volver a asegurar tu bici aquí.</p>
                          <Button onClick={handleRequestQuote} variant="outline" size="sm" className="w-full mt-2" disabled={isPending}>
                             {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Solicitar de nuevo'}
                         </Button>
                    </div>
                )}

                 {status === 'CLOSED' && (
                    <div className="space-y-2">
                         <p className="text-sm text-muted-foreground">El proceso anterior fue cerrado.</p>
                          <Button onClick={handleRequestQuote} className="w-full mt-2" disabled={isPending}>
                             {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Asegurar Bicicleta con Clupp'}
                         </Button>
                    </div>
                )}

            </CardContent>
        </Card>
    );
}
