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
import { Pencil, Loader2, MessageCircle, FileText, Download, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ImageUpload } from '@/components/shared/image-upload';

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
        quoteUrl: string;
    }>({ premium: '', policyValidity: '', status: 'PENDING', quoteUrl: '' });

    const handleEdit = (req: InsuranceRequest) => {
        setSelectedRequest(req);
        setFormData({
            premium: req.premium?.toString() || '',
            policyValidity: req.policyValidity || '',
            status: req.status,
            quoteUrl: req.quoteUrl || ''
        });
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!selectedRequest) return;
        
        // Validación obligatoria: Si el estado es QUOTED, debe haber un quoteUrl
        if (formData.status === 'QUOTED' && !formData.quoteUrl) {
            toast({ 
                title: "Archivo requerido", 
                description: "Debes subir la cotización para cambiar el estado a 'Cotizado'.", 
                variant: "destructive" 
            });
            return;
        }

        startTransition(async () => {
            const premiumVal = parseFloat(formData.premium) || 0;
            const commissionVal = premiumVal * 0.10; // 10% auto-calc

            const result = await updateQuoteDetails(selectedRequest.id, {
                premium: premiumVal,
                commission: commissionVal,
                policyValidity: formData.policyValidity,
                status: formData.status,
                quoteUrl: formData.quoteUrl
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

    const handleQuoteUpload = (url: string) => {
        setFormData(prev => ({ ...prev, quoteUrl: url }));
        toast({ title: "Archivo cargado", description: "La cotización se ha subido correctamente." });
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
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-6">
                    <DialogHeader className="pb-4 border-b">
                        <DialogTitle>Gestionar Cotización</DialogTitle>
                        <DialogDescription>
                            Actualiza los detalles y sube el archivo de cotización.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedRequest && (
                        <div className="flex flex-col gap-6 py-6">
                            {/* Sección de Archivo */}
                            <div className="space-y-3">
                                <Label className="text-base font-semibold">1. Archivo de Cotización</Label>
                                {formData.quoteUrl ? (
                                    <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm transition-all">
                                        <div className="flex items-center gap-3 text-sm text-blue-700 dark:text-blue-300">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium">Cotización cargada</span>
                                                <a href={formData.quoteUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline hover:text-blue-800 inline-flex items-center gap-1">
                                                    Ver archivo <Download className="h-3 w-3" />
                                                </a>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => setFormData({...formData, quoteUrl: ''})}>
                                            Cambiar
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed rounded-lg p-1 bg-slate-50 dark:bg-slate-900/50">
                                        <ImageUpload 
                                            onUploadSuccess={handleQuoteUpload}
                                            storagePath={`insurance-quotes/${selectedRequest.id}`}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Sección de Datos Económicos */}
                            <div className="space-y-4 pt-4 border-t">
                                <Label className="text-base font-semibold">2. Detalles Económicos</Label>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="premium" className="text-sm font-medium">Prima Total ($)</Label>
                                    <Input
                                        id="premium"
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.premium}
                                        onChange={(e) => setFormData({...formData, premium: e.target.value})}
                                        className="h-11 focus-visible:ring-blue-600"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="validity" className="text-sm font-medium">Vigencia del Seguro</Label>
                                    <Input
                                        id="validity"
                                        placeholder="Ej. Anual (365 días)"
                                        value={formData.policyValidity}
                                        onChange={(e) => setFormData({...formData, policyValidity: e.target.value})}
                                        className="h-11 focus-visible:ring-blue-600"
                                    />
                                </div>

                                <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg border flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground font-medium">Comisión Estimada (10%)</span>
                                    <span className="font-bold text-blue-600 dark:text-blue-400">
                                        ${(parseFloat(formData.premium || '0') * 0.10).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Sección de Estado */}
                            <div className="space-y-4 pt-4 border-t">
                                <Label className="text-base font-semibold">3. Estado del Trámite</Label>
                                <div className="space-y-2">
                                    <Label htmlFor="status" className="text-sm font-medium">Cambiar Estatus</Label>
                                    <Select 
                                        value={formData.status} 
                                        onValueChange={(val: InsuranceStatus) => setFormData({...formData, status: val})}
                                    >
                                        <SelectTrigger className="h-11 focus:ring-blue-600">
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
                            </div>
                            
                            {selectedRequest.policyUrl && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                     <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-bold mb-1">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>Póliza Final Recibida</span>
                                     </div>
                                     <a 
                                        href={selectedRequest.policyUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs text-green-600 underline flex items-center gap-1 hover:text-green-700"
                                     >
                                        Descargar póliza subida por el ciclista
                                     </a>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="pt-6 border-t flex flex-row justify-end gap-2 bg-background">
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button type="submit" onClick={handleSave} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
