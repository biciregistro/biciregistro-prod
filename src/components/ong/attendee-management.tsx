'use client';

import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, MoreHorizontal, Check, AlertCircle, CreditCard, UserCheck, Bike, XCircle } from 'lucide-react';
import { EventAttendee, PaymentStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { updateRegistrationPaymentStatus, toggleCheckInStatus, cancelRegistrationManuallyAction } from '@/lib/actions';
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

interface AttendeeManagementProps {
    attendees: EventAttendee[];
    eventId: string;
    showEmergencyContact?: boolean;
    showBikeInfo?: boolean;
}

export function AttendeeManagement({ attendees, eventId, showEmergencyContact, showBikeInfo }: AttendeeManagementProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);

    const { toast } = useToast();
    const router = useRouter();

    const filteredAttendees = attendees.filter(attendee => 
        attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (attendee.bike?.serialNumber && attendee.bike.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handlePaymentChange = async (registrationId: string, newStatus: PaymentStatus) => {
        setIsUpdating(registrationId);
        const result = await updateRegistrationPaymentStatus(registrationId, eventId, newStatus);
        
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

    const getPaymentBadge = (status: PaymentStatus) => {
        switch (status) {
            case 'paid':
                return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Pagado</Badge>;
            case 'pending':
                return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendiente</Badge>;
            case 'not_applicable':
                return <Badge variant="secondary">Gratis/N.A</Badge>;
            default:
                return <Badge variant="outline">Desc.</Badge>;
        }
    };

    return (
        <div className="space-y-4">
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
                            <TableHead>Participante</TableHead>
                            <TableHead>Contacto</TableHead>
                            {showEmergencyContact && <TableHead>Emergencia</TableHead>}
                            {showBikeInfo && <TableHead>Bicicleta</TableHead>}
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
                                            disabled={isUpdating === attendee.id || attendee.status === 'cancelled'}
                                        />
                                    </TableCell>
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
                                            <div className="flex flex-col text-xs">
                                                <span className="font-medium">{attendee.emergencyContactName || 'N/A'}</span>
                                                <span className="text-muted-foreground">{attendee.emergencyContactPhone || '-'}</span>
                                            </div>
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
                                            getPaymentBadge(attendee.paymentStatus)
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={attendee.status === 'cancelled'}>
                                                    <span className="sr-only">Abrir menú</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem 
                                                    onClick={() => handlePaymentChange(attendee.id, 'paid')}
                                                    disabled={attendee.paymentStatus === 'paid'}
                                                >
                                                    <Check className="mr-2 h-4 w-4" /> Marcar como Pagado
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => handlePaymentChange(attendee.id, 'pending')}
                                                    disabled={attendee.paymentStatus === 'pending'}
                                                >
                                                    <AlertCircle className="mr-2 h-4 w-4" /> Marcar como Pendiente
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => handlePaymentChange(attendee.id, 'not_applicable')}
                                                >
                                                    <CreditCard className="mr-2 h-4 w-4" /> Marcar como N/A (Gratis)
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
                                <TableCell colSpan={showBikeInfo ? (showEmergencyContact ? 8 : 7) : (showEmergencyContact ? 7 : 6)} className="h-24 text-center">
                                    No se encontraron participantes.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

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
        </div>
    );
}
