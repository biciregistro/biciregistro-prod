'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { Bike } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { markAsRecovered, registerBike, reportTheft } from '@/lib/actions';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Camera } from 'lucide-react';


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

const bikeRegistrationFormSchema = z.object({
    serialNumber: z.string().min(3, "El número de serie es obligatorio."),
    make: z.string().min(2, "La marca es obligatoria."),
    model: z.string().min(1, "El modelo es obligatorio."),
    color: z.string().min(2, "El color es obligatorio."),
});

type BikeRegistrationFormValues = z.infer<typeof bikeRegistrationFormSchema>;

function SubmitButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending} className="w-full">{pending ? 'Registrando...' : 'Registrar Bicicleta'}</Button>;
}

export function BikeRegistrationForm({ userId }: { userId: string }) {
    const [state, formAction] = useActionState(registerBike, null);
    
    const form = useForm<BikeRegistrationFormValues>({
        resolver: zodResolver(bikeRegistrationFormSchema),
        defaultValues: {
            serialNumber: "",
            make: "",
            model: "",
            color: ""
        },
    });

    return (
        <Form {...form}>
            <form action={formAction} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Registrar una Nueva Bicicleta</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {state?.message && (
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

                    </CardContent>
                    <CardFooter>
                        <SubmitButton />
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}

function ReportTheftButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" variant="destructive" className="w-full" disabled={pending}>{pending ? 'Reportando...' : 'Reportar como Robada'}</Button>;
}
function MarkRecoveredButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" variant="secondary" className="w-full bg-green-500 hover:bg-green-600 text-white" disabled={pending}>{pending ? 'Actualizando...' : 'Marcar como Recuperada'}</Button>;
}

export function TheftReportForm({ bike }: { bike: Bike }) {
    if (bike.status === 'stolen') {
        return <form action={() => markAsRecovered(bike.id)}><MarkRecoveredButton /></form>
    }
    return <form action={() => reportTheft(bike.id)}><ReportTheftButton /></form>
}
