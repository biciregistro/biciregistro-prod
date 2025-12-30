'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, MoreHorizontal, Check, AlertCircle, CreditCard, UserCheck, Bike, XCircle, Wallet, HeartPulse, ShieldAlert, Phone, FileText, Shirt, Download, Table as TableIcon, Ban } from 'lucide-react';
import { EventAttendee, PaymentStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toggleCheckInStatus, cancelRegistrationManuallyAction } from '@/lib/actions';
import { registerManualPaymentAction, updateRegistrationPaymentStatusAction } from '@/lib/actions/financial-actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import dynamic from 'next/dynamic';
import { EditableBibCell } from './editable-bib-cell';

// Dynamic import for the PDF download modal
const WaiverDownloadModal = dynamic(() => import('./waiver-download-modal').then(mod => mod.WaiverDownloadModal), {
    ssr: false,
    loading: () => null,
});

interface AttendeeManagementProps {
    attendees: EventAttendee[];
    eventId: string;
    eventName: string; // Add event name for PDF filename
    showEmergencyContact?: boolean;
    showBikeInfo?: boolean;
    showWaiverInfo?: boolean; // New prop to control waiver column
    isBlocked?: boolean; // Bloqueo administrativo
    bibConfig?: {
        enabled: boolean;
        mode: 'automatic' | 'dynamic';
    };
    hasJersey?: boolean; // New Prop
}

export function AttendeeManagement({ attendees, eventId, eventName, showEmergencyContact, showBikeInfo, showWaiverInfo, isBlocked, bibConfig, hasJersey }: AttendeeManagementProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
    
    // Emergency Data Modal State
    const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
    const [selectedEmergencyData, setSelectedEmergencyData] = useState<EventAttendee | null>(null);

    // Waiver Download Modal State
    const [waiverModalOpen, setWaiverModalOpen] = useState(false);
    const [selectedParticipantForWaiver, setSelectedParticipantForWaiver] = useState<{ id: string, name: string } | null>(null);

    // Jersey Order Modal State
    const [jerseyModalOpen, setJerseyModalOpen] = useState(false);

    const { toast } = useToast();
    const router = useRouter();

    const filteredAttendees = attendees.filter(attendee => 
        attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (attendee.bike?.serialNumber && attendee.bike.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // --- JERSEY LOGIC ---
    const jerseyStats = useMemo(() => {
        if (!hasJersey) return { total: 0, breakdown: [] };

        const breakdownMap = new Map<string, number>();
        let total = 0;

        attendees.forEach(att => {
            if (att.status !== 'cancelled' && att.jerseyModel && att.jerseySize) {
                const key = `${att.jerseyModel}|${att.jerseySize}`;
                breakdownMap.set(key, (breakdownMap.get(key) || 0) + 1);
                total++;
            }
        });

        const breakdown = Array.from(breakdownMap.entries()).map(([key, count]) => {
            const [model, size] = key.split('|');
            return { model, size, count };
        }).sort((a, b) => a.model.localeCompare(b.model) || a.size.localeCompare(b.size));

        return { total, breakdown };
    }, [attendees, hasJersey]);

    const downloadJerseyCSV = () => {
        const csvContent = "data:text/csv;charset=utf-8," 
            + "Modelo de Jersey,Talla,Cantidad\n"
            + jerseyStats.breakdown.map(e => `${e.model},${e.size},${e.count}`).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `orden_jerseys_${eventName.replace(/[\s/]/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    // --------------------

    const handlePaymentChange = async (registrationId: string, newStatus: PaymentStatus) => {
        setIsUpdating(registrationId);
        const result = await updateRegistrationPaymentStatusAction(registrationId, eventId, newStatus);
        
        if (result.success) {
            toast({
                title: "Estado actualizado",
                description: `Pago marcado como ${newStatus === 'paid' ? 'Pagado' : newStatus === 'pending' ? 'Pendiente' : 'N/A'}.`,
            });
        } else {
            toast({
                title: "Error",
                description: result.error || "No se pudo actualizar el estado.",
                variant: "destructive"
            });
        }
        setIsUpdating(null);
    };

    const handleManualPayment = async (registrationId: string) => {
        setIsUpdating(registrationId);
        const result = await registerManualPaymentAction(registrationId, eventId);
        
        if (result.success) {
            toast({
                title: "Pago registrado",
                description: "Se ha marcado como pagado en efectivo. La comisión se sumará a tu balance.",
            });
        } else {
            toast({
                title: "Error",
                description: result.error || "No se pudo registrar el pago.",
                variant: "destructive"
            });
        }
        setIsUpdating(null);
    };

    const handleCheckInToggle = async (registrationId: string, currentStatus: boolean) => {
        setIsUpdating(registrationId);
        const newStatus = !currentStatus;
        const result = await toggleCheckInStatus(registrationId, eventId, newStatus);

        if (result.success) {
             toast({
                title: newStatus ? "Check-in realizado" : "Check-in revertido",
                description: newStatus ? "Asistente marcado como presente." : "Marca de asistencia eliminada.",
            });
        } else {
            toast({
                title: "Error",
                description: result.error || "No se pudo actualizar la asistencia.",
                variant: "destructive"
            });
        }
        setIsUpdating(null);
    };

    const openCancelDialog = (id: string) => {
        setSelectedAttendeeId(id);
        setCancelDialogOpen(true);
    };

    const openEmergencyModal = (attendee: EventAttendee) => {
        setSelectedEmergencyData(attendee);
        setEmergencyModalOpen(true);
    };

    const openWaiverModal = (attendee: EventAttendee) => {
        setSelectedParticipantForWaiver({ id: attendee.id, name: `${attendee.name} ${attendee.lastName}` });
        setWaiverModalOpen(true);
    };


    const handleCancelRegistration = async () => {
        if (!selectedAttendeeId) return;
        setIsUpdating(selectedAttendeeId);
        
        const result = await cancelRegistrationManuallyAction(selectedAttendeeId, eventId);

        if (result.success) {
            toast({
                title: "Inscripción cancelada",
                description: "Se ha liberado el cupo y marcado como cancelado.",
            });
        } else {
            toast({
                title: "Error",
                description: result.error || "No se pudo cancelar la inscripción.",
                variant: "destructive"
            });
        }
        
        setCancelDialogOpen(false);
        setIsUpdating(null);
        setSelectedAttendeeId(null);
    };

    const getPaymentBadge = (attendee: EventAttendee) => {
        const statusMap = {
            paid: <Badge variant="default" className="bg-green-600 hover:bg-green-700 w-fit">Pagado</Badge>,
            pending: <Badge variant="outline" className="text-yellow-600 border-yellow-600 w-fit">Pendiente</Badge>,
            not_applicable: <Badge variant="secondary" className="w-fit">Gratis/N.A</Badge>,
        };

        const methodMap = {
            manual: <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Wallet className="h-3 w-3" /> Efectivo</span>,
            platform: <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><CreditCard className="h-3 w-3" /> Plataforma</span>,
        };

        return (
            <div className="flex flex-col gap-1">
                {statusMap[attendee.paymentStatus] || <Badge variant="outline">Desc.</Badge>}
                {attendee.paymentStatus === 'paid' && attendee.paymentMethod && methodMap[attendee.paymentMethod]}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            
            {/* Jersey Summary Card */}
            {hasJersey && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4 animate-in fade-in slide-in-from-top-2">
                    <Card className="bg-muted/30 border-dashed border-primary/20">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-full text-primary">
                                    <Shirt className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Jerseys Solicitados</p>
                                    <p className="text-2xl font-bold">{jerseyStats.total}</p>
                                </div>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setJerseyModalOpen(true)}>
                                <TableIcon className="h-4 w-4 mr-2" />
                                Ver Orden
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <Input
                    placeholder="Buscar por nombre, email o serie..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
                <div className="text-sm text-muted-foreground">
                    Mostrando {filteredAttendees.length} de {attendees.length} inscritos
                </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">Check-in</TableHead>
                             {bibConfig?.enabled && (
                                <TableHead className="w-[100px]">No. Corredor</TableHead>
                            )}
                            <TableHead>Participante</TableHead>
                            <TableHead>Contacto</TableHead>
                            {showEmergencyContact && <TableHead>Info Médica</TableHead>}
                            {showBikeInfo && <TableHead>Bicicleta</TableHead>}
                            {hasJersey && <TableHead>Jersey</TableHead>}
                            {showWaiverInfo && <TableHead>Responsiva</TableHead>}
                            <TableHead>Nivel/Cat.</TableHead>
                            <TableHead>Pago</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAttendees.length > 0 ? (
                            filteredAttendees.map((attendee) => (
                                <TableRow 
                                    key={attendee.id} 
                                    className={cn(
                                        attendee.status === 'cancelled' && "bg-muted/50 opacity-60",
                                        attendee.checkedIn && "bg-green-50/50 dark:bg-green-900/10"
                                    )}
                                >
                                    <TableCell>
                                        <Switch
                                            checked={attendee.checkedIn}
                                            onCheckedChange={() => handleCheckInToggle(attendee.id, attendee.checkedIn)}
                                            disabled={isUpdating === attendee.id || attendee.status === 'cancelled' || isBlocked}
                                        />
                                    </TableCell>
                                    {bibConfig?.enabled && (
                                        <TableCell>
                                            {bibConfig.mode === 'automatic' ? (
                                                <span className="font-mono font-medium">
                                                    {attendee.bibNumber ? `#${attendee.bibNumber.toString().padStart(3, '0')}` : '-'}
                                                </span>
                                            ) : (
                                                <EditableBibCell 
                                                    registrationId={attendee.id}
                                                    eventId={eventId}
                                                    initialBibNumber={attendee.bibNumber}
                                                />
                                            )}
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className={cn("font-medium", attendee.status === 'cancelled' && "line-through text-muted-foreground")}>
                                                {attendee.name} {attendee.lastName}
                                            </span>
                                            <span className="text-xs text-muted-foreground">{attendee.email}</span>
                                            {attendee.status === 'cancelled' && (
                                                <Badge variant="destructive" className="w-fit text-[10px] mt-1 px-1 h-5">CANCELADO</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                         {attendee.whatsapp ? (
                                            <a 
                                                href={`https://wa.me/${attendee.whatsapp.replace(/\D/g, '')}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-green-600 hover:underline text-sm"
                                            >
                                                <MessageCircle className="h-3 w-3" />
                                                {attendee.whatsapp}
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                    </TableCell>
                                    {showEmergencyContact && (
                                        <TableCell>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-8 text-xs gap-1 border-red-200 text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
                                                onClick={() => openEmergencyModal(attendee)}
                                            >
                                                <HeartPulse className="h-3 w-3" /> Ver Datos
                                            </Button>
                                        </TableCell>
                                    )}
                                    {showBikeInfo && (
                                        <TableCell>
                                            {attendee.bike ? (
                                                <div className="flex flex-col text-xs">
                                                    <span className="font-medium">{attendee.bike.make} {attendee.bike.model}</span>
                                                    <span className="font-mono text-muted-foreground text-[10px]">{attendee.bike.serialNumber}</span>
                                                </div>
                                            ) : (
                                                <span className="text-amber-600 dark:text-amber-500 text-xs font-medium">Aún no ha registrado Bici</span>
                                            )}
                                        </TableCell>
                                    )}
                                    {hasJersey && (
                                        <TableCell>
                                            {attendee.jerseyModel ? (
                                                <div className="flex flex-col text-xs">
                                                    <span className="font-medium">{attendee.jerseyModel}</span>
                                                    <span className="text-muted-foreground">Talla: {attendee.jerseySize}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                    )}
                                     {showWaiverInfo && (
                                        <TableCell>
                                            {attendee.waiverSigned ? (
                                                <Button 
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs gap-1 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                                                    onClick={() => openWaiverModal(attendee)}
                                                >
                                                    <FileText className="h-3 w-3" /> Firmada
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">No requerida/firmada</span>
                                            )}
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            <span>{attendee.tierName}</span>
                                            <span className="text-muted-foreground">{attendee.categoryName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {attendee.status === 'cancelled' ? (
                                            <span className="text-xs text-muted-foreground italic">Cancelado</span>
                                        ) : (
                                            getPaymentBadge(attendee)
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={attendee.status === 'cancelled' || isBlocked}>
                                                    <span className="sr-only">Abrir menú</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem 
                                                    onClick={() => handleManualPayment(attendee.id)}
                                                    disabled={attendee.paymentStatus === 'paid'}
                                                >
                                                    <Wallet className="mr-2 h-4 w-4" /> Pago en Efectivo
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => handlePaymentChange(attendee.id, 'paid')}
                                                    disabled={attendee.paymentStatus === 'paid'}
                                                >
                                                    <CreditCard className="mr-2 h-4 w-4" /> Pago en Plataforma
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => handlePaymentChange(attendee.id, 'pending')}
                                                    disabled={attendee.paymentStatus === 'pending'}
                                                >
                                                    <AlertCircle className="mr-2 h-4 w-4" /> Marcar Pendiente
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem 
                                                    className="text-red-600 focus:text-red-600"
                                                    onClick={() => openCancelDialog(attendee.id)}
                                                >
                                                    <XCircle className="mr-2 h-4 w-4" /> Cancelar Inscripción
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={showBikeInfo ? (showEmergencyContact ? (hasJersey ? 10 : 9) : (hasJersey ? 9 : 8)) : (showEmergencyContact ? (hasJersey ? 9 : 8) : (hasJersey ? 8 : 7))} className="h-24 text-center">
                                    No se encontraron participantes.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción marcará al asistente como cancelado y liberará un cupo en el evento. El usuario podrá volver a inscribirse si lo desea.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelRegistration} className="bg-red-600 hover:bg-red-700">
                            Sí, cancelar inscripción
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Emergency Data Dialog */}
            <Dialog open={emergencyModalOpen} onOpenChange={setEmergencyModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <ShieldAlert className="h-5 w-5" />
                            Información de Emergencia
                        </DialogTitle>
                        <DialogDescription>
                            Datos proporcionados por {selectedEmergencyData?.name} {selectedEmergencyData?.lastName}. 
                            <br/>Esta información es confidencial.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedEmergencyData && (
                        <div className="grid gap-4 py-4">
                            <div className="flex items-start gap-4 p-4 border rounded-md bg-muted/20">
                                <HeartPulse className="h-5 w-5 text-red-500 mt-1" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">Tipo de Sangre</p>
                                    <p className="text-lg font-bold">{selectedEmergencyData.bloodType || 'No especificado'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 border rounded-md bg-muted/20">
                                <Ban className="h-5 w-5 text-orange-500 mt-1" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">Alergias Conocidas</p>
                                    <p className="text-base font-semibold">{selectedEmergencyData.allergies || 'Ninguna / No especificada'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 border rounded-md bg-muted/20">
                                <FileText className="h-5 w-5 text-blue-500 mt-1" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">Seguro Médico / Póliza</p>
                                    <p className="text-base">{selectedEmergencyData.insuranceInfo || 'No especificado'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 border rounded-md bg-muted/20">
                                <Phone className="h-5 w-5 text-green-600 mt-1" />
                                <div className="space-y-1 w-full">
                                    <p className="text-sm font-medium leading-none">Contacto de Emergencia</p>
                                    <p className="text-base font-semibold">{selectedEmergencyData.emergencyContactName}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-lg font-mono text-muted-foreground">{selectedEmergencyData.emergencyContactPhone}</p>
                                        {selectedEmergencyData.emergencyContactPhone && selectedEmergencyData.emergencyContactPhone !== '***' && (
                                            <Button size="sm" variant="outline" asChild>
                                                <a href={`tel:${selectedEmergencyData.emergencyContactPhone}`}>Llamar</a>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {selectedEmergencyData.emergencyContactName === '***' && (
                                <p className="text-xs text-center text-muted-foreground italic">
                                    * Los datos han sido ocultados automáticamente por política de privacidad (evento finalizado hace +24h).
                                </p>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button onClick={() => setEmergencyModalOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             {/* Waiver Download Modal */}
            {selectedParticipantForWaiver && (
                <WaiverDownloadModal
                    isOpen={waiverModalOpen}
                    onClose={() => setWaiverModalOpen(false)}
                    registrationId={selectedParticipantForWaiver.id}
                    eventName={eventName}
                    participantName={selectedParticipantForWaiver.name}
                />
            )}

            {/* Jersey Production Order Modal */}
            <Dialog open={jerseyModalOpen} onOpenChange={setJerseyModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Orden de Producción de Jerseys</DialogTitle>
                        <DialogDescription>
                            Detalle de tallas y modelos solicitados por asistentes confirmados.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                        <div className="rounded-md border max-h-[300px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Modelo</TableHead>
                                        <TableHead>Talla</TableHead>
                                        <TableHead className="text-right">Cantidad</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {jerseyStats.breakdown.length > 0 ? (
                                        jerseyStats.breakdown.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">{item.model}</TableCell>
                                                <TableCell>{item.size}</TableCell>
                                                <TableCell className="text-right font-bold">{item.count}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                                No hay órdenes aún.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setJerseyModalOpen(false)}>Cerrar</Button>
                        <Button onClick={downloadJerseyCSV} className="gap-2">
                            <Download className="h-4 w-4" />
                            Descargar CSV
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
