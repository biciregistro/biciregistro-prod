'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { transferOwnership } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
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


interface TransferOwnershipFormProps {
    bikeId: string;
    bikeName: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} aria-disabled={pending}>
            {pending ? 'Transfiriendo...' : 'Confirmar y Transferir'}
        </Button>
    );
}

export function TransferOwnershipForm({ bikeId, bikeName }: TransferOwnershipFormProps) {
    const initialState = { error: '' };
    const [state, dispatch] = useActionState(transferOwnership, initialState);
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Transferir Propiedad</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form action={(formData) => {
                    dispatch(formData);
                    // This is optimistic. A better approach might involve checking `state`
                    // in a useEffect hook before closing the dialog.
                    if (!state.error) {
                        // setOpen(false);
                    }
                }}>
                    <DialogHeader>
                        <DialogTitle>Transferir Propiedad</DialogTitle>
                        <DialogDescription>
                            Estás a punto de transferir la propiedad de <strong>{bikeName}</strong>. 
                            Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        <input type="hidden" name="bikeId" value={bikeId} />
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="newOwnerEmail" className="text-right">
                                Email del Nuevo Dueño
                            </Label>
                            <Input
                                id="newOwnerEmail"
                                name="newOwnerEmail"
                                type="email"
                                placeholder="ejemplo@email.com"
                                className="col-span-3"
                                required
                            />
                        </div>
                    </div>

                    {state.error && (
                         <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {state.error}
                            </AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancelar</Button>
                        </DialogClose>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
