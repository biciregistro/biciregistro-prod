'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { Bike } from '@/lib/types';
import { cn, calculateBikeProfileCompleteness } from '@/lib/utils';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { countries, type Country } from '@/lib/countries';
import { Progress } from './ui/progress';


const bikeStatusStyles: { [key in Bike['status']]: string } = {
  safe: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
  stolen: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
  in_transfer: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700',
};

export function BikeCard({ bike }: { bike: Bike }) {
  const bikeImage = bike.photos[0] || PlaceHolderImages.find(p => p.id === 'bike-1')?.imageUrl || '';
  const completeness = calculateBikeProfileCompleteness(bike);

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
        <CardContent className="p-4 space-y-3">
            <div>
                <h3 className="font-semibold text-lg">{bike.make} {bike.model}</h3>
                <p className="text-sm text-muted-foreground">{bike.color}</p>
                <p className="text-sm font-mono text-muted-foreground mt-2">{bike.serialNumber}</p>
            </div>
            <div className="space-y-1">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Perfil Completo</span>
                    <span>{completeness}%</span>
                </div>
                <Progress value={completeness} className="h-2" />
            </div>
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
    modelYear: z.string().optional(),
    modality: z.string().optional(),
});

type BikeFormValues = z.infer<typeof bikeFormSchema>;

const modalityOptions = ["Urbana", "Gravel", "Pista", "XC", "Enduro", "Downhill", "Trail", "E-Bike", "Dirt Jump", "MTB"];


function SubmitButton({ isEditing }: { isEditing?: boolean }) {
    const { pending } = useFormStatus();
    const text = isEditing ? 'Guardar Cambios' : 'Registrar Bicicleta';
    const pendingText = isEditing ? 'Guardando...' : 'Registrando...';
    return <Button type="submit" disabled={pending} className="w-full">{pending ? pendingText : text}</Button>;
}

function PhotoUploadSlot({ label, description }: { label: string, description: string }) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="flex items-center gap-4">
                <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                    <Camera className="w-8 h-8"/>
                </div>
                <Button type="button" variant="outline">Subir Foto</Button>
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
    )
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
            color: bike?.color || "",
            modelYear: bike?.modelYear || "",
            modality: bike?.modality || "",
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
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="modelYear" render={({ field }) => (
                                <FormItem><FormLabel>Año Modelo</FormLabel><FormControl><Input placeholder="ej., 2023" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="color" render={({ field }) => (
                                <FormItem><FormLabel>Color Principal</FormLabel><FormControl><Input placeholder="ej., Azul" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        
                         <FormField
                            control={form.control}
                            name="modality"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Modalidad</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona una modalidad" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {modalityOptions.map(option => (
                                                <SelectItem key={option} value={option}>{option}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />


                        <div className="space-y-6 pt-4">
                            <h4 className="font-medium text-base border-b pb-2">Fotografías</h4>
                            <PhotoUploadSlot label="Foto Lateral" description="Toma una foto completa del costado de tu bicicleta." />
                            <PhotoUploadSlot label="Foto de Número de Serie" description="Toma una foto clara y legible del número de serie." />
                            <PhotoUploadSlot label="Foto Adicional 1 (Componentes)" description="Foto de alguna modificación o componente específico." />
                            <PhotoUploadSlot label="Foto Adicional 2 (Componentes)" description="Foto de otra seña particular o componente." />
                        </div>
                        
                        <div className="space-y-2 pt-4">
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
    country: z.string().min(1, "El país es obligatorio."),
    state: z.string().min(1, "El estado/provincia es obligatorio."),
    location: z.string().min(1, "La ubicación es obligatoria."),
    details: z.string().min(1, "Los detalles son obligatorios."),
});
type TheftReportValues = z.infer<typeof theftReportSchema>;

export function TheftReportForm({ bike }: { bike: Bike }) {
    const [showForm, setShowForm] = useState(false);
    const [state, formAction] = useActionState(reportTheft, null);
    const { toast } = useToast();
    const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(countries.find(c => c.name === 'México'));
    const [states, setStates] = useState<string[]>(selectedCountry?.states || []);

    const form = useForm<TheftReportValues>({
        resolver: zodResolver(theftReportSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            country: 'México',
            state: '',
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

    const handleCountryChange = (countryName: string) => {
        const country = countries.find(c => c.name === countryName);
        setSelectedCountry(country);
        setStates(country ? country.states : []);
        form.setValue('country', countryName);
        form.setValue('state', ''); // Reset state/province
    };


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
        <Card>
            <CardHeader>
                <CardTitle>Reportar Robo</CardTitle>
                <CardDescription>Completa los detalles sobre el robo.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form action={formAction} className="space-y-4">
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
                            name="country"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>País</FormLabel>
                                    <Select onValueChange={handleCountryChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un país" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {countries.map(country => (
                                                <SelectItem key={country.code} value={country.name}>{country.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="state"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estado / Provincia</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedCountry}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un estado/provincia" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {states.map(state => (
                                                <SelectItem key={state} value={state}>{state}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ubicación (Ciudad y/o dirección)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="ej., Ciudad de México, cerca de la fuente del parque" {...field} />
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
                                    <FormLabel>Detalles del robo</FormLabel>
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
            </CardContent>
        </Card>
    );
}
