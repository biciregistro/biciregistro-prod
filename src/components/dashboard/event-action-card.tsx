'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cancelRegistrationAction } from '@/lib/actions';
import { createPaymentPreferenceAction } from '@/lib/actions/financial-actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MessageCircle, CreditCard, Loader2, XCircle, CheckCircle2, Clock } from 'lucide-react';
import type { Event, EventRegistration } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface EventActionCardProps {
    event: Event;
    registration: EventRegistration;
    ongProfile: { contactWhatsapp?: string } | null | undefined;
    whatsappUrl: string;
    isFinished?: boolean;
}

export function EventActionCard({ event, registration, ongProfile, whatsappUrl, isFinished }: EventActionCardProps) {
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isPaymentPending, startPaymentTransition] = useTransition();
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [optimisticPaid, setOptimisticPaid] = useState(false);

    useEffect(() => {
        if (searchParams.get('collection_status') === 'approved') {
            setOptimisticPaid(true);
        }
    }, [searchParams]);

    const handleCancel = () => {
        startTransition(async () => {
            const result = await cancelRegistrationAction(event.id);
            
            if (result.success) {
                toast({
                    title: "Inscripción Cancelada",
                    description: "Tu asistencia ha sido cancelada exitosamente.",
                });
                setIsCancelModalOpen(false);
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error || "No se pudo cancelar la inscripción.",
                });
            }
        });
    };

    const handlePayClick = () => {
        if (!registration || !registration.id) return;

        startPaymentTransition(async () => {
            const result = await createPaymentPreferenceAction(event.id, registration.id);

            if (result.success && result.url) {
                 // Redirect to Mercado Pago
                 window.location.href = result.url;
            } else {
                toast({
                    variant: "destructive",
                    title: "Error al iniciar pago",
                    description: result.error || "Intenta de nuevo más tarde."
                });
            }
        });
    };

    const isCancelled = registration.status === 'cancelled';
    const isPaid = registration.paymentStatus === 'paid' || optimisticPaid;
    const hasCost = event.costType === 'Con Costo';

    return (
        <>
            <Card className="border-primary/20 shadow-md">
                <CardHeader>
                    <CardTitle className="text-lg">Acciones</CardTitle>
                    <CardDescription>Gestiona tu participación</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isFinished ? (
                         <Alert className="bg-slate-100 border-slate-200">
                            <Clock className="h-4 w-4" />
                            <AlertTitle>Evento Finalizado</AlertTitle>
                            <AlertDescription>
                                Este evento ha concluido. Las acciones de registro ya no están disponibles.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <>
                            {/* Botón de Whatsapp para comprobante manual (solo si no está pagado por plataforma) */}
                            {!isCancelled && !isPaid && ongProfile?.contactWhatsapp && (
                                <Button variant="outline" className="w-full border-green-600 text-green-700 hover:bg-green-50" asChild>
                                    <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                                        <MessageCircle className="mr-2 h-4 w-4" />
                                        Enviar Comprobante de Pago
                                    </Link>
                                </Button>
                            )}
                            
                            {/* Botón de Pago en Línea */}
                            {!isCancelled && hasCost && !isPaid && (
                                <Button 
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md animate-pulse" 
                                    onClick={handlePayClick}
                                    disabled={isPaymentPending}
                                >
                                    {isPaymentPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                                    Pagar Ahora en Línea
                                </Button>
                            )}
                        </>
                    )}

                    {/* Estado Pagado */}
                    {!isCancelled && isPaid && (
                        <div className="flex items-center justify-center p-3 bg-green-100 text-green-800 rounded-md font-medium">
                            <CheckCircle2 className="mr-2 h-5 w-5" />
                            Pago Confirmado
                        </div>
                    )}

                    <Button variant="ghost" className="w-full" asChild>
                        <Link href={`/events/${event.id}`}>
                            Ver Página Pública
                        </Link>
                    </Button>

                    {!isCancelled && !isFinished && (
                        <Button 
                            variant="destructive" 
                            className="w-full mt-4" 
                            onClick={() => setIsCancelModalOpen(true)}
                            disabled={isPending || isPaymentPending}
                        >
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                            Cancelar Inscripción
                        </Button>
                    )}
                    
                    {isCancelled && (
                        <div className="p-4 bg-destructive/10 text-destructive rounded-md text-center text-sm font-medium">
                            Has cancelado tu asistencia a este evento.
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Cancelar asistencia?</DialogTitle>
                        <DialogDescription>
                            Esta acción liberará tu cupo para que otra persona pueda asistir. ¿Estás seguro?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCancelModalOpen(false)} disabled={isPending}>
                            No, mantener
                        </Button>
                        <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Sí, cancelar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
