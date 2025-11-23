'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { cancelRegistrationAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MessageCircle, CreditCard, Loader2, XCircle } from 'lucide-react';
import type { Event, EventRegistration } from '@/lib/types';

interface EventActionCardProps {
    event: Event;
    registration: EventRegistration;
    ongProfile: { contactWhatsapp?: string } | null | undefined;
    whatsappUrl: string;
}

export function EventActionCard({ event, registration, ongProfile, whatsappUrl }: EventActionCardProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

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

    const isCancelled = registration.status === 'cancelled';

    return (
        <>
            <Card className="border-primary/20 shadow-md">
                <CardHeader>
                    <CardTitle className="text-lg">Acciones</CardTitle>
                    <CardDescription>Gestiona tu participación</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!isCancelled && ongProfile?.contactWhatsapp && (
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white" asChild>
                            <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Enviar Comprobante
                            </Link>
                        </Button>
                    )}
                    
                    {!isCancelled && (
                        <Button variant="outline" className="w-full" disabled>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Pagar en Línea (Próximamente)
                        </Button>
                    )}

                    <Button variant="ghost" className="w-full" asChild>
                        <Link href={`/events/${event.id}`}>
                            Ver Página Pública
                        </Link>
                    </Button>

                    {!isCancelled && (
                        <Button 
                            variant="destructive" 
                            className="w-full mt-4" 
                            onClick={() => setIsCancelModalOpen(true)}
                            disabled={isPending}
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
