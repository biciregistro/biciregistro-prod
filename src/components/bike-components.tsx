'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { Bike } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { markAsRecovered, registerBike, reportTheft, updateBike } from '@/lib/actions';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from './ui/textarea';


const bikeStatusStyles: { [key in Bike['status']]: string } = {
  safe: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
  stolen: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
  in_transfer: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700',
};

export function BikeCard({ bike }: { bike: Bike }) {
  const bikeImage = bike.photos[0] || PlaceHolderImages.find(p => p.id === 'bike-1')?.imageUrl || '';

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg">
        <CardHeader className="p-0">
            <Link href={`/dashboard/bikes/${bike.id}`} className="block">
                <div className="relative aspect-video">
                    <Image
                        src={bikeImage}
                        alt={`${bike.make} ${bike.model}`}
                        data-ai-hint="bicycle photo"
                        fill
                        className="object-cover"
                    />
                     <Badge className={cn("absolute top-2 right-2", bikeStatusStyles[bike.status])}>
                        {bike.status === 'safe' ? 'En Regla' : bike.status === 'stolen' ? 'Robada' : 'En transferencia'}
                    </Badge>
                </div>
            </Link>
        </CardHeader>
        <CardContent className="p-4">
            <h3 className="font-semibold text-lg">{bike.make} {bike.model}</h3>
            <p className="text-sm text-muted-foreground">{bike.color}</p>
            <p className="text-sm font-mono text-muted-foreground mt-2">{bike.serialNumber}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0">
            <Button asChild className="w-full">
                <Link href={`/dashboard/bikes/${bike.id}`}>Ver Detalles</Link>
            </Button>
        </CardFooter>
    </Card>
  );
}

const bikeFormSchema = z.object({
    id: z.string().optional(),
    serialNumber: z.string().min(3, "El número de serie es obligatorio."),
    make: z.string().min(2, "La marca es obligatoria."),
    model: z.string().min(1, "El modelo es obligatorio."),
    color: z.string().min(2, "El color es obligatorio."),
});

type BikeFormValues = z.infer<typeof bikeFormSchema>;

function SubmitButton({ isEditing }: { isEditing?: boolean }) {
    const { pending } = useFormStatus();
    const text = isEditing ? 'Guardar Cambios' : 'Registrar Bicicleta';
    const pendingText = isEditing ? 'Guardando...' : 'Registrando...';
    return <Button type="submit" disabled={pending} className="w-full">{pending ? pendingText : text}</Button>;
}

export function BikeRegistrationForm({ userId, bike, onSuccess }: { userId: string, bike?: Bike, onSuccess?: () => void }) {
    const isEditing = !!bike;
    const action = isEditing ? updateBike : registerBike;
    const [state, formAction] = useActionState(action, null);
    const { toast } = useToast();
    
    const form = useForm<BikeFormValues>({
        resolver: zodResolver(bikeFormSchema),
        defaultValues: {
            id: bike?.id,
            serialNumber: bike?.serialNumber || "",
            make: bike?.make || "",
            model: bike?.model || "",
            color: bike?.color || ""
        },
    });

    useEffect(() => {
        if (state?.message) {
            toast({
                title: state.errors ? "Error" : "Éxito",
                description: state.message,
                variant: state.errors ? "destructive" : "default",
            });
            if (!state.errors && onSuccess) {
                onSuccess();
            }
        }
    }, [state, toast, onSuccess]);


    return (
        <Form {...form}>
            <form action={formAction} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{isEditing ? 'Editar Bicicleta' : 'Registrar una Nueva Bicicleta'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {state?.message && !onSuccess && (
                            <Alert variant={state.errors ? "destructive" : "default"}>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>{state.errors ? 'Error' : 'Éxito'}</AlertTitle>
                                <AlertDescription>{state.message}</AlertDescription>
                            </Alert>
                        )}

                        <FormField
                            control={form.control}
                            name="serialNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número de Serie</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ubicado en la parte inferior del cuadro de tu bicicleta" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="make" render={({ field }) => (
                                <FormItem><FormLabel>Marca</FormLabel><FormControl><Input placeholder="ej., Trek" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="model" render={({ field }) => (
                                <FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="ej., Marlin 5" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        
                        <FormField control={form.control} name="color" render={({ field }) => (
                            <FormItem><FormLabel>Color Principal</FormLabel><FormControl><Input placeholder="ej., Azul" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <div className="space-y-2">
                            <Label>Fotos</Label>
                            <div className="flex items-center gap-4">
                                <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                                    <Camera className="w-8 h-8"/>
                                </div>
                                <Button type="button" variant="outline">Subir Fotos</Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Sube hasta 5 fotos de tu bicicleta.</p>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Prueba de Propiedad</Label>
                            <div>
                                <Button type="button" variant="outline">Subir Documento</Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Sube el recibo u otra prueba de propiedad (opcional).</p>
                        </div>

                        <input type="hidden" name="userId" value={userId} />
                        {isEditing && <input type="hidden" name="id" value={bike.id} />}

                    </CardContent>
                    <CardFooter className="flex flex-col-reverse sm:flex-row gap-2">
                         {isEditing ? (
                            <Button variant="outline" className="w-full" type="button" onClick={onSuccess}>
                                Cancelar
                            </Button>
                         ) : (
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Garaje</Link>
                            </Button>
                         )}
                        <SubmitButton isEditing={isEditing} />
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}

function ReportTheftButton({ ...props }) {
    const { pending } = useFormStatus();
    return <Button type="submit" variant="destructive" className="w-full" disabled={pending} {...props}>{pending ? 'Reportando...' : 'Reportar como Robada'}</Button>;
}
function MarkRecoveredButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" variant="secondary" className="w-full bg-green-500 hover:bg-green-600 text-white" disabled={pending}>{pending ? 'Actualizando...' : 'Marcar como Recuperada'}</Button>;
}

const theftReportSchema = z.object({
    date: z.string().min(1, "La fecha es obligatoria."),
    location: z.string().min(1, "La ubicación es obligatoria."),
    details: z.string().min(1, "Los detalles son obligatorios."),
});
type TheftReportValues = z.infer<typeof theftReportSchema>;

export function TheftReportForm({ bike }: { bike: Bike }) {
    const [showForm, setShowForm] = useState(false);
    const [state, formAction] = useActionState(reportTheft, null);
    const { toast } = useToast();

    const form = useForm<TheftReportValues>({
        resolver: zodResolver(theftReportSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            location: "",
            details: ""
        },
    });

    useEffect(() => {
        if (state?.message) {
            toast({
                title: state.errors ? "Error" : "Éxito",
                description: state.message,
                variant: state.errors ? "destructive" : "default",
            });
            if (!state.errors) {
                setShowForm(false);
            }
        }
    }, [state, toast]);

    if (bike.status === 'stolen') {
        return (
            <form action={async () => {
                await markAsRecovered(bike.id)
                toast({ title: "Bicicleta Actualizada", description: "La bicicleta ha sido marcada como recuperada." })
            }}>
                <MarkRecoveredButton />
            </form>
        )
    }

    if (!showForm) {
        return <Button variant="destructive" className="w-full" onClick={() => setShowForm(true)}>Reportar como Robada</Button>
    }

    return (
        <Form {...form}>
            <form action={formAction} className="space-y-4">
                 <CardHeader className="p-0 mb-4">
                    <CardTitle>Reportar Robo</CardTitle>
                    <CardDescription>Completa los detalles sobre el robo.</CardDescription>
                </CardHeader>
                
                {state?.message && (
                    <Alert variant={state.errors ? "destructive" : "default"}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{state.errors ? 'Error' : 'Éxito'}</AlertTitle>
                        <AlertDescription>{state.message}</AlertDescription>
                    </Alert>
                )}
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Fecha del Robo</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ubicación (aproximada)</FormLabel>
                            <FormControl>
                                <Input placeholder="ej., Parque Central, cerca de la fuente" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="details"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Detalles Adicionales</FormLabel>
                            <FormControl>
                                <Textarea placeholder="ej., La dejé candada a las 2pm y cuando volví a las 4pm ya no estaba." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <input type="hidden" name="bikeId" value={bike.id} />
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                    <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancelar</Button>
                    <ReportTheftButton />
                </div>
            </form>
        </Form>
    );
}
