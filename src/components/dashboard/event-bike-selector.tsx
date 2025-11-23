'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { selectEventBikeAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bike, Loader2, AlertCircle } from 'lucide-react';
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
                    <div className="text-center space-y-4 py-2">
                        <div className="flex justify-center text-yellow-600">
                            <AlertCircle className="h-8 w-8" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            No tienes bicicletas registradas. Registra tu bici para mejorar la seguridad del evento.
                        </p>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/dashboard/register">Registrar Bicicleta</Link>
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
                        
                        {isPending && <p className="text-xs text-muted-foreground text-center animate-pulse">Guardando selección...</p>}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
