'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { selectEventBikeAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bike, Loader2, AlertTriangle } from 'lucide-react';
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
    
    const currentBike = userBikes.find(b => b.id === registration.bikeId);
    const isCancelled = registration.status === 'cancelled';

    // CA6: Auto-select bike if it's the only one and none is selected
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
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error || "No se pudo vincular la bicicleta.",
                });
            }
        });
    };

    if (isCancelled) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bike className="h-5 w-5" />
                    Tu Bicicleta para el evento
                </CardTitle>
            </CardHeader>
            <CardContent>
                {userBikes.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h4 className="font-bold text-yellow-900 leading-tight">
                                    Registra tu bicicleta para completar tu registro
                                </h4>
                                <p className="text-sm text-yellow-800 leading-relaxed">
                                    Por tu seguridad y la de los demás asistentes, el organizador requiere que registres tu bicicleta con la que participarás.
                                </p>
                            </div>
                        </div>
                        <Button asChild className="w-full bg-yellow-600 hover:bg-yellow-700 text-white border-none shadow-sm">
                            <Link href={`/dashboard/register?returnTo=/dashboard/events/${eventId}`}>
                                Registrar Bicicleta
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {currentBike ? (
                            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                                <div>
                                    <p className="font-semibold">{currentBike.make} {currentBike.model}</p>
                                    <p className="text-xs text-muted-foreground font-mono mt-1">Serie: {currentBike.serialNumber}</p>
                                </div>
                                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                                    Seleccionada
                                </Badge>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground mb-2">
                                Selecciona con qué bicicleta asistirás:
                            </p>
                        )}

                        <Select 
                            onValueChange={handleBikeSelect} 
                            value={selectedBikeId} 
                            disabled={isPending}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar bicicleta..." />
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
                            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground animate-pulse">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Guardando selección...</span>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
