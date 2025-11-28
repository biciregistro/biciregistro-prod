'use client';

import { useState, useTransition } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { toggleEventBlockAction } from '@/lib/actions/financial-actions';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface EventAdminControlsProps {
    eventId: string;
    isBlocked: boolean;
}

export function EventAdminControls({ eventId, isBlocked: initialBlocked }: EventAdminControlsProps) {
    const [isBlocked, setIsBlocked] = useState(initialBlocked);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleToggle = (checked: boolean) => {
        setIsBlocked(checked);
        startTransition(async () => {
            const result = await toggleEventBlockAction(eventId, checked);
            if (!result.success) {
                setIsBlocked(!checked); // Revert
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error || "No se pudo actualizar el estado.",
                });
            } else {
                toast({
                    title: checked ? "Evento Bloqueado" : "Evento Desbloqueado",
                    description: checked ? "Se han restringido las funciones de gestión para el organizador." : "Se han restaurado las funciones.",
                });
            }
        });
    };

    return (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 mb-6">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <ShieldAlert className="h-5 w-5" />
                    <CardTitle className="text-lg">Control de Riesgo</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="block-mode" className="text-base font-medium">Bloquear Gestión del Evento</Label>
                        <p className="text-sm text-muted-foreground">
                            Impide que el organizador realice check-in o descargue listas. Útil si tiene deudas pendientes.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        <Switch
                            id="block-mode"
                            checked={isBlocked}
                            onCheckedChange={handleToggle}
                            disabled={isPending}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
