'use client';

import { useActionState, useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { transferOwnership } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Wallet } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import { cn } from '@/lib/utils';


interface TransferOwnershipFormProps {
    bikeId: string;
    bikeName: string;
    className?: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full sm:w-auto bg-primary text-primary-foreground">
            {pending ? 'Transfiriendo...' : 'Confirmar y Transferir'}
        </Button>
    );
}

export function TransferOwnershipForm({ bikeId, bikeName, className }: TransferOwnershipFormProps) {
    const initialState = { error: '', success: false };
    const [state, dispatch] = useActionState(transferOwnership, initialState);
    const [open, setOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (state.success) {
            setOpen(false); 
            router.push('/dashboard');
        }
    }, [state.success, router]);


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className={cn("w-full", className)}>Transferir Propiedad</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form action={dispatch}>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Transferir Propiedad</DialogTitle>
                        <DialogDescription className="text-muted-foreground mt-2">
                            Estás a punto de transferir la propiedad de <span className="font-bold text-foreground">{bikeName}</span>. 
                            Asegúrate de que el correo sea el correcto.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-6 py-6">
                        <input type="hidden" name="bikeId" value={bikeId} />
                        
                        <div className="space-y-2">
                            <Label htmlFor="newOwnerEmail" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                Email del Nuevo Dueño
                            </Label>
                            <Input
                                id="newOwnerEmail"
                                name="newOwnerEmail"
                                type="email"
                                placeholder="ejemplo@email.com"
                                className="h-12"
                                required
                            />
                            <p className="text-[10px] text-muted-foreground">El usuario debe tener una cuenta activa en BiciRegistro.</p>
                        </div>

                        <div className="space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Wallet className="w-4 h-4 text-primary" />
                                <Label htmlFor="saleAmount" className="text-sm font-bold uppercase tracking-wider">
                                    Monto de Venta (Opcional)
                                </Label>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                                <Input
                                    id="saleAmount"
                                    name="saleAmount"
                                    type="number"
                                    placeholder="0"
                                    className="pl-7 h-12 bg-white"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground">Este monto se registrará como el nuevo valor comercial de la bicicleta en el ecosistema.</p>
                        </div>
                    </div>

                    {state.error && (
                         <Alert variant="destructive" className="mb-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {state.error}
                            </AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <DialogClose asChild>
                            <Button type="button" variant="ghost">Cancelar</Button>
                        </DialogClose>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
