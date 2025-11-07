'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useActionState, useEffect, useState, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { debounce } from 'lodash';

import type { Bike } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { markAsRecovered, registerBike, reportTheft, updateBike } from '@/lib/actions';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { countries, type Country } from '@/lib/countries';
import { ImageUpload } from '@/components/shared/image-upload';
import { bikeBrands } from '@/lib/bike-brands';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const bikeStatusStyles: { [key in Bike['status']]: string } = {
  safe: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
  stolen: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
  in_transfer: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700',
};

// Reusable component for displaying a bike detail item
function BikeDetailItem({ label, value }: { label: string; value: string | undefined | null }) {
    if (!value) return null;
    return (
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-base">{value}</p>
        </div>
    );
}

export function BikeCard({ bike }: { bike: Bike }) {
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const bikeImage = bike.photos[0] || PlaceHolderImages.find(p => p.id === 'bike-1')?.imageUrl || '';

    return (
        <Card className="overflow-hidden transition-all hover:shadow-lg w-full">
            <div className="flex flex-col md:flex-row">
                {/* Image Section */}
                <div className="md:w-1/3 relative aspect-video md:aspect-square">
                    <Image
                        src={bikeImage}
                        alt={`${bike.make} ${bike.model}`}
                        fill
                        className="object-cover"
                    />
                </div>

                {/* Content and Actions Section */}
                <div className="md:w-2/3 flex flex-col p-4">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <CardTitle className="text-2xl">{bike.make} {bike.model}</CardTitle>
                            <CardDescription className="font-mono">{bike.serialNumber}</CardDescription>
                        </div>
                        <Badge className={cn("text-base", bikeStatusStyles[bike.status])}>
                            {bike.status === 'safe' ? 'En Regla' : bike.status === 'stolen' ? 'Robada' : 'En Transferencia'}
                        </Badge>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4 my-4 flex-grow">
                        <BikeDetailItem label="Color" value={bike.color} />
                        <BikeDetailItem label="Modalidad" value={bike.modality} />
                        <BikeDetailItem label="Año Modelo" value={bike.modelYear} />
                    </div>

                    {/* Footer with Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 mt-auto pt-4 border-t">
                        <Button asChild variant="outline" className="w-full">
                            <Link href={`/dashboard/bikes/${bike.id}`}>Ver Detalles Completos</Link>
                        </Button>
                        
                        {bike.status === 'safe' && (
                            <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="destructive" className="w-full">
                                        <ShieldAlert className="mr-2 h-4 w-4" /> Reportar Robo
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Reportar el Robo de tu Bicicleta</DialogTitle>
                                        <DialogDescription>
                                            Estás a punto de reportar tu {bike.make} {bike.model} como robada.
                                            Por favor, proporciona los detalles del incidente.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <TheftReportForm 
                                        bike={bike} 
                                        onSuccess={() => setIsReportModalOpen(false)} 
                                    />
                                </DialogContent>
                            </Dialog>
                        )}
                        
                        {bike.status === 'stolen' && (
                            <TheftReportForm bike={bike} />
                        )}
                    </div>
                </div>
            </div>
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

function SubmitButton({ isEditing, isSerialInvalid }: { isEditing?: boolean, isSerialInvalid?: boolean }) {
    const { pending } = useFormStatus();
    const text = isEditing ? 'Guardar Cambios' : 'Registrar Bicicleta';
    const pendingText = isEditing ? 'Guardando...' : 'Registrando...';
    return <Button type="submit" disabled={pending || isSerialInvalid} className="w-full">{pending ? pendingText : text}</Button>;
}

export function BikeRegistrationForm({ userId, bike, onSuccess }: { userId: string, bike?: Bike, onSuccess?: () => void }) {
    const isEditing = !!bike;
    const action = isEditing ? updateBike : registerBike;
    const [state, formAction] = useActionState(action, null);
    const { toast } = useToast();

    const [photoUrl, setPhotoUrl] = useState(bike?.photos?.[0] || '');
    const [serialNumberPhotoUrl, setSerialNumberPhotoUrl] = useState(bike?.photos?.[1] || '');
    const [additionalPhoto1Url, setAdditionalPhoto1Url] = useState(bike?.photos?.[2] || '');
    const [additionalPhoto2Url, setAdditionalPhoto2Url] = useState(bike?.photos?.[3] || '');
    const [ownershipProofUrl, setOwnershipProofUrl] = useState(bike?.ownershipProof || '');
    const [isCheckingSerial, setIsCheckingSerial] = useState(false);
    const [serialExists, setSerialExists] = useState(false);
    
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

    const checkSerialNumber = useCallback(debounce(async (serial: string) => {
        if (serial.length < 3 || (isEditing && serial === bike?.serialNumber)) {
            setSerialExists(false);
            setIsCheckingSerial(false);
            return;
        }
        setIsCheckingSerial(true);
        try {
            const response = await fetch('/api/check-serial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serialNumber: serial }),
            });
            const data = await response.json();
            setSerialExists(!data.isUnique);
        } catch (error) {
            console.error("Error checking serial number:", error);
        } finally {
            setIsCheckingSerial(false);
        }
    }, 500), [isEditing, bike?.serialNumber]);

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
                                        <Input 
                                            placeholder="Ubicado en la parte inferior del cuadro de tu bicicleta" 
                                            {...field}
                                            onBlur={(e) => {
                                                field.onBlur();
                                                checkSerialNumber(e.target.value);
                                            }}
                                        />
                                    </FormControl>
                                    {isCheckingSerial && <p className="text-xs text-muted-foreground">Verificando...</p>}
                                    {serialExists && <FormMessage>Este número de serie ya está registrado.</FormMessage>}
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="make"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Marca</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona una marca" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {bikeBrands.map(brand => (
                                                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value} name={field.name}>
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
                            <div className="space-y-2">
                                <Label>Foto Lateral (*Obligatoria)</Label>
                                <ImageUpload onUploadSuccess={setPhotoUrl} storagePath="bike-photos" />
                                <p className="text-xs text-muted-foreground">Toma una foto completa del costado de tu bicicleta.</p>
                                {state?.errors?.photoUrl && (
                                    <p className="text-sm font-medium text-destructive">
                                        {state.errors.photoUrl[0]}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Foto de Número de Serie (*Obligatoria)</Label>
                                <ImageUpload onUploadSuccess={setSerialNumberPhotoUrl} storagePath="serial-photos" />
                                <p className="text-xs text-muted-foreground">Toma una foto clara y legible del número de serie.</p>
                                {state?.errors?.serialNumberPhotoUrl && (
                                    <p className="text-sm font-medium text-destructive">
                                        {state.errors.serialNumberPhotoUrl[0]}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Foto Adicional 1 (Componentes)</Label>
                                <ImageUpload onUploadSuccess={setAdditionalPhoto1Url} storagePath="bike-photos" />
                                <p className="text-xs text-muted-foreground">Foto de alguna modificación o componente específico.</p>
                            </div>
                             <div className="space-y-2">
                                <Label>Foto Adicional 2 (Seña Particular)</Label>
                                <ImageUpload onUploadSuccess={setAdditionalPhoto2Url} storagePath="bike-photos" />
                                <p className="text-xs text-muted-foreground">Foto de alguna otra seña particular o componente.</p>
                            </div>
                        </div>
                        
                        <div className="space-y-2 pt-4">
                            <Label>Prueba de Propiedad</Label>
                            <ImageUpload onUploadSuccess={setOwnershipProofUrl} storagePath="ownership-proofs" />
                            <p className="text-xs text-muted-foreground">Sube la factura, recibo o alguna otra prueba de propiedad (opcional).</p>
                        </div>
                        <input type="hidden" name="userId" value={userId} />
                        <input type="hidden" name="photoUrl" value={photoUrl} />
                        <input type="hidden" name="serialNumberPhotoUrl" value={serialNumberPhotoUrl} />
                        <input type="hidden" name="additionalPhoto1Url" value={additionalPhoto1Url} />
                        <input type="hidden" name="additionalPhoto2Url" value={additionalPhoto2Url} />
                        <input type="hidden" name="ownershipProofUrl" value={ownershipProofUrl} />
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
                        <SubmitButton isEditing={isEditing} isSerialInvalid={serialExists} />
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
    time: z.string().optional(),
    country: z.string().min(1, "El país es obligatorio."),
    state: z.string().min(1, "El estado/provincia es obligatorio."),
    location: z.string().min(1, "La ubicación es obligatoria."),
    details: z.string().min(1, "Los detalles son obligatorios."),
});
type TheftReportValues = z.infer<typeof theftReportSchema>;

export function TheftReportForm({ bike, onSuccess }: { bike: Bike, onSuccess?: () => void }) {
    const [showForm, setShowForm] = useState(false);
    const [state, formAction] = useActionState(reportTheft, null);
    const { toast } = useToast();
    const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(countries.find(c => c.name === 'México'));
    const [states, setStates] = useState<string[]>(selectedCountry?.states || []);

    const form = useForm<TheftReportValues>({
        resolver: zodResolver(theftReportSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0,5),
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
                if (onSuccess) {
                    onSuccess();
                }
            }
        }
    }, [state, toast, onSuccess]);

    const handleCountryChange = (countryName: string) => {
        const country = countries.find(c => c.name === countryName);
        setSelectedCountry(country);
        setStates(country ? country.states : []);
        form.setValue('country', countryName);
        form.setValue('state', '');
    };


    if (bike.status === 'stolen') {
        return (
            <form action={async () => {
                await markAsRecovered(bike.id)
                toast({ title: "Bicicleta Actualizada", description: "La bicicleta ha sido marcada como recuperada." })
                if (onSuccess) onSuccess();
            }} className="w-full">
                <MarkRecoveredButton />
            </form>
        )
    }
    
    // Si onSuccess está definido, el formulario siempre es visible (contexto modal)
    const isVisible = showForm || onSuccess;

    if (!isVisible) {
        return <Button variant="destructive" className="w-full" onClick={() => setShowForm(true)}>Reportar como Robada</Button>
    }

    return (
        <Form {...form}>
            <form action={formAction} className="space-y-4">
                {state?.message && (
                    <Alert variant={state.errors ? "destructive" : "default"}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{state.errors ? 'Error' : 'Éxito'}</AlertTitle>
                        <AlertDescription>{state.message}</AlertDescription>
                    </Alert>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        name="time"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Hora del Robo (aprox.)</FormLabel>
                                <FormControl>
                                    <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>País</FormLabel>
                            <Select onValueChange={handleCountryChange} defaultValue={field.value} name={field.name}>
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
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedCountry} name={field.name}>
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
                    {onSuccess && <Button variant="outline" type="button" onClick={onSuccess}>Cancelar</Button>}
                    <ReportTheftButton />
                </div>
            </form>
        </Form>
    );
}
