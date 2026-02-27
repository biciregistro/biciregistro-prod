'use client';

import { useState, useTransition } from 'react';
import { InsuranceRequest, InsuranceStatus } from '@/lib/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { updateQuoteDetails } from '@/lib/actions/insurance-actions';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Loader2, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils'; // Import added

const statusColors: Record<InsuranceStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    QUOTED: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-gray-100 text-gray-800',
    PAYMENT_LINK_SENT: 'bg-purple-100 text-purple-800',
    PAID: 'bg-green-600 text-white',
    CLOSED: 'bg-gray-300 text-gray-800'
};

const statusLabels: Record<InsuranceStatus, string> = {
    PENDING: 'Por Cotizar',
    QUOTED: 'Cotizado',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    PAYMENT_LINK_SENT: 'Link Enviado',
    PAID: 'Pagado',
    CLOSED: 'Cerrado'
};

interface InsuranceListProps {
    requests: InsuranceRequest[];
}

export function InsuranceList({ requests }: InsuranceListProps) {
    const { toast } = useToast();
    const [selectedRequest, setSelectedRequest] = useState<InsuranceRequest | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Form state
    const [formData, setFormData] = useState<{
        premium: string;
        policyValidity: string;
        status: InsuranceStatus;
    }>({ premium: '', policyValidity: '', status: 'PENDING' });

    const handleEdit = (req: InsuranceRequest) => {
        setSelectedRequest(req);
        setFormData({
            premium: req.premium?.toString() || '',
            policyValidity: req.policyValidity || '',
            status: req.status
        });
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!selectedRequest) return;
        
        startTransition(async () => {
            const premiumVal = parseFloat(formData.premium) || 0;
            const commissionVal = premiumVal * 0.10; // 10% auto-calc

            const result = await updateQuoteDetails(selectedRequest.id, {
                premium: premiumVal,
                commission: commissionVal,
                policyValidity: formData.policyValidity,
                status: formData.status
            });

            if (result.success) {
                toast({ title: "Guardado", description: "La cotización ha sido actualizada." });
                setIsDialogOpen(false);
                window.location.reload();
            } else {
                 toast({ title: "Error", description: "No se pudo actualizar.", variant: "destructive" });
            }
        });
    };

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Usuario / Email</TableHead>
                            <TableHead>WhatsApp</TableHead>
                            <TableHead>Bicicleta</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Prima / Com.</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No hay solicitudes de seguro.
                                </TableCell>
                            </TableRow>
                        ) : (
                            requests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="whitespace-nowrap" suppressHydrationWarning>
                                        {format(new Date(req.createdAt), "dd MMM HH:mm", { locale: es })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col min-w-[150px]">
                                            <span className="font-bold text-sm">
                                                {req.userName || "Usuario sin nombre"}
                                            </span>
                                            <span className="text-xs text-muted-foreground">{req.userEmail}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {req.userPhone ? (
                                            <a 
                                                href={`https://wa.me/${req.userPhone.replace(/\D/g,'')}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-sm flex items-center gap-1 hover:underline text-green-600 font-bold"
                                            >
                                                <MessageCircle className="h-4 w-4" />
                                                {req.userPhone}
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground text-xs italic">No registrado</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <p><span className="font-bold">{req.bikeInfo.brand}</span> {req.bikeInfo.model}</p>
                                            <p className="text-xs text-muted-foreground">{req.bikeInfo.color} • {req.bikeInfo.year}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn(statusColors[req.status], "whitespace-nowrap")}>
                                            {statusLabels[req.status]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {req.premium ? (
                                            <div className="text-sm">
                                                <p className="font-bold">${req.premium}</p>
                                                <p className="text-xs text-muted-foreground">Com: ${req.commission?.toFixed(2)}</p>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(req)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gestionar Cotización</DialogTitle>
                        <DialogDescription>
                            Actualiza los detalles y el estado de la solicitud.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedRequest && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="premium" className="text-right">
                                    Prima ($)
                                </Label>
                                <Input
                                    id="premium"
                                    type="number"
                                    value={formData.premium}
                                    onChange={(e) => setFormData({...formData, premium: e.target.value})}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="validity" className="text-right">
                                    Vigencia
                                </Label>
                                <Input
                                    id="validity"
                                    placeholder="Ej. Anual"
                                    value={formData.policyValidity}
                                    onChange={(e) => setFormData({...formData, policyValidity: e.target.value})}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-right">
                                    Estado
                                </Label>
                                <Select 
                                    value={formData.status} 
                                    onValueChange={(val: InsuranceStatus) => setFormData({...formData, status: val})}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Selecciona estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(statusLabels).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                             <div className="grid grid-cols-4 items-center gap-4 pt-2">
                                <Label className="text-right">Comisión</Label>
                                <div className="col-span-3 text-sm font-medium">
                                    ${(parseFloat(formData.premium || '0') * 0.10).toFixed(2)} (Calculado al 10%)
                                </div>
                            </div>
                            
                            {selectedRequest.policyUrl && (
                                <div className="col-span-4 text-center pt-2">
                                     <a 
                                        href={selectedRequest.policyUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 underline"
                                     >
                                        Ver Póliza Subida
                                     </a>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" onClick={handleSave} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
