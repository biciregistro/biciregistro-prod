'use client';

import { useState, useTransition, useEffect } from 'react';
import { selectEventBikeAction, swapBikeAssignmentsAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bike, Loader2, AlertTriangle, ChevronRight, Info, Edit, Users } from 'lucide-react';
import { SimpleBikeForm } from '@/components/widget/simple-bike-form';
import type { Bike as BikeType, EventRegistration } from '@/lib/types';

interface EventBikeSelectorProps {
    userBikes: BikeType[];
    allEventRegistrations: EventRegistration[];
    registration: EventRegistration;
    eventId: string;
}


export function EventBikeSelector({ userBikes, allEventRegistrations, registration, eventId }: EventBikeSelectorProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [selectedBikeId, setSelectedBikeId] = useState<string>(registration.bikeId || '');

    // --- UI States ---
    const [isEditingBike, setIsEditingBike] = useState(false);
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
    const [swapDetails, setSwapDetails] = useState<{ bikeToAssign: BikeType; otherRegistration: EventRegistration } | null>(null);

    const currentBike = userBikes.find(b => b.id === registration.bikeId);
    const isCancelled = registration.status === 'cancelled';

    const getBikeAssignment = (bikeId: string): EventRegistration | undefined => {
        return allEventRegistrations.find(reg => reg.id !== registration.id && reg.bikeId === bikeId);
    };

    const handleBikeSelect = (newBikeId: string) => {
        if (!newBikeId || newBikeId === registration.bikeId) {
            setSelectedBikeId(registration.bikeId || '');
            setIsEditingBike(false);
            return;
        }

        const bikeToAssign = userBikes.find(b => b.id === newBikeId);
        if (!bikeToAssign) return;

        const otherRegistration = getBikeAssignment(newBikeId);

        if (otherRegistration) {
            // Case 1: SWAP
            setSwapDetails({ bikeToAssign, otherRegistration });
            setIsSwapModalOpen(true);
        } else {
            // Case 2: SIMPLE ASSIGNMENT (or change to a free bike)
            setSelectedBikeId(newBikeId);
            startTransition(async () => {
                const result = await selectEventBikeAction(registration.id, newBikeId);
                if (result.success) {
                    toast({
                        title: "Bicicleta actualizada",
                        description: "Tu bicicleta ha sido actualizada para el evento.",
                    });
                    setIsEditingBike(false);
                } else {
                    toast({
                        variant: "destructive",
                        title: "Error al actualizar",
                        description: result.error || "No se pudo cambiar la bicicleta.",
                    });
                    setSelectedBikeId(registration.bikeId || ''); // Revert on error
                }
            });
        }
    };

    const executeSwap = () => {
        if (!swapDetails) return;

        startTransition(async () => {
            const result = await swapBikeAssignmentsAction(registration.id, swapDetails.otherRegistration.id, eventId);
            if (result.success) {
                toast({
                    title: "Intercambio exitoso",
                    description: "Las bicicletas han sido intercambiadas entre los participantes.",
                });
                setIsEditingBike(false);
            } else {
                 toast({
                    variant: "destructive",
                    title: "Error en el intercambio",
                    description: result.error || "No se pudieron intercambiar las bicicletas.",
                });
            }
            setSwapDetails(null);
        });
    }

    const handleNewBikeSuccess = (bikeData: any, pointsAwarded?: number) => {
        setShowRegisterForm(false);
        setIsEditingBike(false);
        if (pointsAwarded) {
             toast({ title: `¡Ganaste ${pointsAwarded} KM!`, description: "Bicicleta blindada y registrada para el evento." });
        }
    };

    if (isCancelled) return null;
    const selectorBikes = userBikes;

    return (
        <div className="space-y-4 w-full">
            {userBikes.length === 0 && !showRegisterForm ? (
                <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-4"><div className="flex gap-3"><AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" /><div className="space-y-1"><h4 className="font-bold text-amber-900 leading-tight">Registra tu bicicleta</h4><p className="text-sm text-amber-800 leading-relaxed">No tienes bicicletas en tu garaje. Regístrala ahora para completar tu Check-in.</p></div></div></div>
            ) : (
                <div className="space-y-4">
                    {currentBike && !isEditingBike ? (
                        <div className="flex items-center justify-between p-3 border border-green-200 rounded-md bg-green-50/30">
                            <div className="flex items-center gap-3"><div className="p-2 bg-green-100 text-green-700 rounded-full"><Bike className="w-4 h-4" /></div><div><p className="font-semibold text-green-900">{currentBike.make} {currentBike.model}</p><p className="text-xs text-green-700 font-mono mt-1">Serie: {currentBike.serialNumber}</p></div></div>
                            <Button variant="outline" size="sm" onClick={() => setIsEditingBike(true)} className="h-8 gap-2 bg-white hover:bg-slate-50"><Edit className="h-3 w-3" />Cambiar</Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-slate-700">{isEditingBike ? "Elige una nueva bicicleta:" : "Selecciona con qué bicicleta competirás:"}</p>
                            <Select onValueChange={handleBikeSelect} value={selectedBikeId} disabled={isPending}>
                                <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Elegir del garaje..." /></SelectTrigger>
                                <SelectContent>
                                    {selectorBikes.map(bike => {
                                        const assignment = getBikeAssignment(bike.id);
                                        const label = assignment ? `${bike.make} ${bike.model}` : `${bike.make} ${bike.model} (Serie: ${bike.serialNumber})`;
                                        return (
                                            <SelectItem key={bike.id} value={bike.id}>
                                                <div className="flex justify-between items-center w-full">
                                                    <span>{label}</span>
                                                    {assignment && <Badge variant="secondary" className="ml-2 flex items-center gap-1"><Users className="h-3 w-3"/> En uso</Badge>}
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            {isPending && <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground animate-pulse"><Loader2 className="h-3 w-3 animate-spin" /><span>Guardando selección...</span></div>}
                            {isEditingBike && <Button variant="ghost" size="sm" onClick={() => {setIsEditingBike(false); setSelectedBikeId(registration.bikeId || '');}} className="w-full">Cancelar</Button>}
                        </div>
                    )}
                </div>
            )}

            {!showRegisterForm && <div className="pt-2"><Button variant="ghost" className="w-full h-auto py-3 text-primary hover:bg-primary/5 hover:text-primary flex flex-col items-center gap-1 group transition-all" onClick={() => setShowRegisterForm(true)}><span className="text-xs text-muted-foreground group-hover:text-primary/70 transition-colors">¿Usarás una bicicleta diferente?</span><span className="text-sm font-bold flex items-center gap-1">Regístrala aquí <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></span></Button></div>}
            {showRegisterForm && <div className="mt-6 pt-6 border-t border-dashed space-y-4"><div className="flex items-center justify-between"><h4 className="font-bold text-sm">Registrar Nueva Bicicleta</h4><Button variant="ghost" size="sm" onClick={() => setShowRegisterForm(false)}>Cancelar</Button></div><SimpleBikeForm onSuccess={handleNewBikeSuccess} /></div>}

            <AlertDialog open={isSwapModalOpen} onOpenChange={setIsSwapModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Intercambio de Bicicleta</AlertDialogTitle>
                        <AlertDialogDescription>
                            La bicicleta <span className="font-bold">{swapDetails?.bikeToAssign.make} {swapDetails?.bikeToAssign.model}</span> ya está asignada a otro participante.
                            ¿Deseas intercambiar las bicicletas entre ambos?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSwapDetails(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={executeSwap} disabled={isPending}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Intercambio"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}