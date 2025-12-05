'use client';

import { useState, useEffect, useRef } from 'react';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { registerPayoutAction, getPayoutsAction } from '@/lib/actions/financial-actions';
import type { AdminEventFinancialView } from './admin-event-financial-list';
import type { Payout } from '@/lib/types';

interface PayoutManagerModalProps {
    event: AdminEventFinancialView | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void; // To refresh parent list
}

export function PayoutManagerModal({ event, isOpen, onClose, onSuccess }: PayoutManagerModalProps) {
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Reset and Load History when modal opens
    useEffect(() => {
        if (isOpen && event) {
            setAmount('');
            setNotes('');
            setFile(null);
            loadHistory(event.id);
        }
    }, [isOpen, event]);

    const loadHistory = async (eventId: string) => {
        setIsLoadingHistory(true);
        try {
            const data = await getPayoutsAction(eventId);
            setPayouts(data);
        } catch (error) {
            console.error("Failed to load payouts", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!event || !file || !amount) return;

        setIsSubmitting(true);
        
        try {
            const formData = new FormData();
            formData.append('eventId', event.id);
            formData.append('ongId', event.ongId);
            formData.append('amount', amount);
            formData.append('notes', notes);
            formData.append('proofFile', file);

            const result = await registerPayoutAction(formData);

            if (result.success) {
                toast({
                    title: "Dispersión Registrada",
                    description: "El pago se ha guardado y el comprobante se ha subido.",
                });
                onSuccess(); // Refresh parent
                loadHistory(event.id); // Refresh local list
                setAmount('');
                setNotes('');
                setFile(null);
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error || "No se pudo registrar el pago.",
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error inesperado",
                description: "Ocurrió un error al procesar la solicitud.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

    if (!event) return null;

    const pendingAmount = event.pendingDisbursement;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Gestión de Dispersiones</DialogTitle>
                    <DialogDescription>
                        Registra pagos realizados a <strong>{event.ongName}</strong> para el evento <strong>{event.name}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-4">
                    {/* LEFT: New Payout Form */}
                    <div className="space-y-4 border-r pr-4">
                        <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Saldo pendiente por dispersar</p>
                            <p className={`text-2xl font-bold ${pendingAmount < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                                {formatCurrency(pendingAmount)}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Monto a Dispersar</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        placeholder="0.00"
                                        className="pl-7"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="file">Comprobante (PDF o Imagen)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="file"
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        required
                                    />
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        className="w-full"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        {file ? file.name : "Seleccionar Archivo"}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notas / Referencia</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Número de autorización, referencia bancaria..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" /> Registrar Dispersión
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>

                    {/* RIGHT: History Table */}
                    <div className="space-y-4 pl-2">
                        <h3 className="font-semibold text-sm">Historial de Pagos</h3>
                        <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingHistory ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center">
                                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : payouts.length > 0 ? (
                                        payouts.map((payout) => (
                                            <TableRow key={payout.id}>
                                                <TableCell className="text-xs">
                                                    {new Date(payout.date).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-xs">
                                                    {formatCurrency(payout.amount)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                                                        <a href={payout.proofUrl} target="_blank" rel="noopener noreferrer" title="Ver Comprobante">
                                                            <FileText className="h-3 w-3 text-blue-600" />
                                                        </a>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-xs text-muted-foreground">
                                                No hay dispersiones registradas.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
