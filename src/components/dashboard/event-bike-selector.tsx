'use client';

import { useState, useTransition, useEffect } from 'react';
import { selectEventBikeAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bike, Loader2, AlertTriangle, ChevronRight } from 'lucide-react';
import { SimpleBikeForm } from '@/components/widget/simple-bike-form';
import type { Bike as BikeType, EventRegistration } from '@/lib/types';

interface EventBikeSelectorProps {
    userBikes: BikeType[];
    registration: EventRegistration;
    eventId: string;
}

export function EventBikeSelector({ userBikes, registration, eventId }: EventBikeSelectorProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [selectedBikeId, setSelectedBikeId] = useState<string>(registration.bikeId || '');
    
    // UI States
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    
    const currentBike = userBikes.find(b => b.id === registration.bikeId);
    const isCancelled = registration.status === 'cancelled';

    // Auto-select bike if it's the only one and none is selected
    useEffect(() => {
        if (userBikes.length === 1 && !registration.bikeId && !isPending) {
            handleBikeSelect(userBikes[0].id);
        }
    }, [userBikes, registration.bikeId]);

    const handleBikeSelect = (bikeId: string) => {
        setSelectedBikeId(bikeId);
        startTransition(async () => {
            const result = await selectEventBikeAction(eventId, bikeId);
            if (result.success) {
                toast({
                    title: "Bicicleta vinculada",
                    description: "Tu bicicleta ha sido registrada para el evento.",
                });
                setShowRegisterForm(false);
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error || "No se pudo vincular la bicicleta.",
                });
            }
        });
    };

    const handleNewBikeSuccess = (bikeData: any, pointsAwarded?: number) => {
        // La acción de registro ya debió asignar el bikeId al evento si se hizo desde el wizard,
        // pero para forzar refresco ocultamos el formulario. El componente padre llamará a router.refresh()
        setShowRegisterForm(false);
        if (pointsAwarded) {
             toast({
                title: `¡Ganaste ${pointsAwarded} KM!`,
                description: "Bicicleta blindada y registrada para el evento.",
                variant: "default"
            });
        }
    };

    if (isCancelled) return null;

    return (
        <div className="space-y-4 w-full">
            {/* ESTADO: No tiene bicis */}
            {userBikes.length === 0 ? (
                <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-4 flex flex-col space-y-4">
                    <div className="flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="font-bold text-amber-900 leading-tight">
                                Registra tu bicicleta
                            </h4>
                            <p className="text-sm text-amber-800 leading-relaxed">
                                No tienes bicicletas en tu garaje. Regístrala ahora para completar tu Check-in.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                /* ESTADO: Sí tiene bicis, mostrar selector */
                <div className="space-y-4">
                    {currentBike ? (
                        <div className="flex items-center justify-between p-3 border border-green-200 rounded-md bg-green-50/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 text-green-700 rounded-full">
                                    <Bike className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-semibold text-green-900">{currentBike.make} {currentBike.model}</p>
                                    <p className="text-xs text-green-700 font-mono mt-1">Serie: {currentBike.serialNumber}</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-white text-green-700 border-green-200 shadow-sm">
                                Vinculada al Evento
                            </Badge>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-slate-700">
                                Selecciona con qué bicicleta competirás:
                            </p>
                            <Select 
                                onValueChange={handleBikeSelect} 
                                value={selectedBikeId} 
                                disabled={isPending}
                            >
                                <SelectTrigger className="w-full bg-white">
                                    <SelectValue placeholder="Elegir del garaje..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {userBikes.map(bike => (
                                        <SelectItem key={bike.id} value={bike.id}>
                                            {bike.make} {bike.model}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            
                            {isPending && (
                                <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground animate-pulse">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Guardando selección...</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* BOTÓN / FORMULARIO PARA NUEVA BICI */}
            {userBikes.length > 0 && !showRegisterForm && (
                <div className="pt-2">
                    <Button 
                        variant="ghost" 
                        className="w-full h-auto py-3 text-primary hover:bg-primary/5 hover:text-primary flex flex-col items-center gap-1 group transition-all"
                        onClick={() => setShowRegisterForm(true)}
                    >
                        <span className="text-xs text-muted-foreground group-hover:text-primary/70 transition-colors">¿Usarás una bicicleta diferente?</span>
                        <span className="text-sm font-bold flex items-center gap-1">
                            Regístrala aquí <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                    </Button>
                </div>
            )}

            {showRegisterForm && userBikes.length > 0 && (
                <div className="mt-6 pt-6 border-t border-dashed space-y-4">
                     <div className="flex items-center justify-between">
                         <h4 className="font-bold text-sm">Registrar Nueva Bicicleta</h4>
                         <Button variant="ghost" size="sm" onClick={() => setShowRegisterForm(false)}>
                             Cancelar
                         </Button>
                     </div>
                     <SimpleBikeForm onSuccess={handleNewBikeSuccess} />
                </div>
            )}
        </div>
    );
}