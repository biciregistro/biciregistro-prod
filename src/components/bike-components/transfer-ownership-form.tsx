'use client';

import { useActionState, useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { transferOwnership } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Wallet, MessageCircle, UserPlus } from 'lucide-react';
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
    const initialState = { error: '', success: false, userNotFound: false, invitationData: null as any };
    const [state, dispatch] = useActionState(transferOwnership, initialState);
    const [open, setOpen] = useState(false);
    const [whatsapp, setWhatsapp] = useState('');
    const router = useRouter();

    useEffect(() => {
        if (state.success) {
            setOpen(false); 
            router.push('/dashboard');
        }
    }, [state.success, router]);

    const handleInviteWhatsApp = () => {
        if (!state.invitationData || !whatsapp) return;

        const { senderName, bikeMake, bikeModel, invitationLink } = state.invitationData;
        
        const message = `¡Hola! 👋 Te escribo de parte de ${senderName}.

Te contacto porque el Pasaporte Digital de tu ${bikeMake} ${bikeModel} en BiciRegistro.mx está listo para que ruedes con total tranquilidad. 🛡️🚲

Para acceder a tu Certificado de Propiedad y completar su protección contra el mercado negro, te invitamos a activar tu cuenta en este enlace:
🔗 ${invitationLink}

¿Qué es BiciRegistro.mx?✨
No es solo un registro; es un ecosistema ciclista digital que protege a la comunidad, frena el mercado negro y recompensa cada kilómetro que ruedas. Es la herramienta para validar que tu bici es tuya, cuidar tu inversión y ganar beneficios reales por el simple hecho de salir a pedalear.

Avisame cuando hayas creado tu cuenta para hacerte la asignación de tu bicicleta 🚴‍♂️💨`;

        const encodedMessage = encodeURIComponent(message);
        const cleanWhatsapp = whatsapp.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanWhatsapp}?text=${encodedMessage}`, '_blank');
    };


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
                    
                    <div className={cn("grid gap-6 py-6 animate-in fade-in duration-300", state.userNotFound && "hidden")}>
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
                                required={!state.userNotFound}
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
                         <Alert variant={state.userNotFound ? "default" : "destructive"} className={cn("mb-6 mt-6", state.userNotFound && "bg-blue-50 border-blue-200 text-blue-900")}>
                            {state.userNotFound ? <UserPlus className="h-4 w-4 text-blue-600" /> : <AlertCircle className="h-4 w-4" />}
                            <AlertDescription className="font-medium">
                                {state.error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {state.userNotFound && (
                        <div className="mb-6 p-4 border rounded-xl bg-slate-50 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="space-y-2">
                                <Label htmlFor="whatsapp" className="text-xs font-bold uppercase text-muted-foreground">Número de WhatsApp</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        id="whatsapp"
                                        placeholder="521..." 
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                        className="h-10"
                                    />
                                    <Button 
                                        type="button" 
                                        onClick={handleInviteWhatsApp}
                                        className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                        disabled={!whatsapp}
                                    >
                                        <MessageCircle className="w-4 h-4" /> Invitar
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground">Se abrirá WhatsApp con una invitación personalizada.</p>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <DialogClose asChild>
                            <Button type="button" variant="ghost">Cancelar</Button>
                        </DialogClose>
                        {!state.userNotFound ? <SubmitButton /> : (
                            <Button type="submit" variant="outline" className="w-full sm:w-auto">Reintentar</Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
