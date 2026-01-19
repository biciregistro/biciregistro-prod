'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useActionState, useEffect, useState, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { debounce } from 'lodash';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

import type { Bike, BikeFormState, BikeStatus, User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { registerBike, updateBike } from '@/lib/actions/bike-actions';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ImageUpload } from '@/components/shared/image-upload';
import { bikeBrands } from '@/lib/bike-brands';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BikeRegistrationSchema } from '@/lib/schemas';
import { auth } from '@/lib/firebase/client';
import { modalityOptions } from '@/lib/bike-types';
import { RecoverBikeButton } from '@/components/bike-components/recover-bike-button';
import { TheftReportForm } from '@/components/bike-components/theft-report-form';
import { BikeTheftShareMenu } from '@/components/dashboard/bike-theft-share-menu';

const bikeStatusStyles: { [key in BikeStatus]: string } = {
  safe: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
  stolen: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
  in_transfer: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700',
  recovered: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700',
};

const bikeStatusTexts: { [key in BikeStatus]: string } = {
  safe: 'En Regla',
  stolen: 'Robada',
  in_transfer: 'En Transferencia',
  recovered: 'Recuperada',
};

// Reusable component for the required field indicator
const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <FormLabel>
    {children} <span className="text-red-500">*</span>
  </FormLabel>
);

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

export function BikeCard({ bike, user }: { bike: Bike, user?: User }) {
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const bikeImage = bike.photos[0] || PlaceHolderImages.find(p => p.id === 'bike-1')?.imageUrl || '';

    // Logic to show the report button for 'safe' or 'recovered' bikes
    const canReportStolen = bike.status === 'safe' || bike.status === 'recovered';

    // BUG FIX: Force modal to close if bike becomes stolen
    useEffect(() => {
        if (bike.status === 'stolen') {
            setIsReportModalOpen(false);
        }
    }, [bike.status]);

    return (
        <Card className={cn("overflow-hidden transition-all hover:shadow-lg w-full", bike.status === 'stolen' && "border-destructive/50 shadow-md shadow-destructive/10")}>
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
                            {bikeStatusTexts[bike.status]}
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
                        <Button asChild variant="outline" className="flex-1">
                            <Link href={`/dashboard/bikes/${bike.id}`}>Detalles</Link>
                        </Button>
                        
                        {bike.status === 'stolen' && user && (
                            <BikeTheftShareMenu bike={bike} user={user} />
                        )}

                        {canReportStolen && (
                            <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="destructive" className="flex-1">
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
                                        defaultOpen={true}
                                    />
                                </DialogContent>
                            </Dialog>
                        )}
                        
                        {bike.status === 'stolen' && (
                            <RecoverBikeButton bikeId={bike.id} />
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}

type BikeFormValues = z.infer<typeof BikeRegistrationSchema>;

function SubmitButton({ isEditing, isSerialInvalid }: { isEditing?: boolean, isSerialInvalid?: boolean }) {
    const { pending } = useFormStatus();
    const text = isEditing ? 'Guardar Cambios' : 'Registrar Bicicleta';
    const pendingText = isEditing ? 'Guardando...' : 'Registrando...';
    return <Button type="submit" disabled={pending || isSerialInvalid} className="w-full">{pending ? pendingText : text}</Button>;
}

export function BikeRegistrationForm({ userId, bike, onSuccess }: { userId: string, bike?: Bike, onSuccess?: () => void }) {
    const isEditing = !!bike;
    const action = isEditing ? updateBike : registerBike;
    const initialState: BikeFormState = null;
    const [state, formAction] = useActionState(action, initialState);
    const { toast } = useToast();
    const router = useRouter();

    const [photoUrl, setPhotoUrl] = useState(bike?.photos?.[0] || '');
    const [serialNumberPhotoUrl, setSerialNumberPhotoUrl] = useState(bike?.photos?.[1] || '');
    const [additionalPhoto1Url, setAdditionalPhoto1Url] = useState(bike?.photos?.[2] || '');
    const [additionalPhoto2Url, setAdditionalPhoto2Url] = useState(bike?.photos?.[3] || '');
    const [ownershipProofUrl, setOwnershipProofUrl] = useState(bike?.ownershipProof || '');
    const [isCheckingSerial, setIsCheckingSerial] = useState(false);
    const [serialExists, setSerialExists] = useState(false);
    const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
    
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
        });
        return () => unsubscribe();
    }, []);

    const form = useForm<BikeFormValues>({
        resolver: zodResolver(BikeRegistrationSchema),
        defaultValues: {
            serialNumber: bike?.serialNumber || "",
            make: bike?.make || "",
            model: bike?.model || "",
            color: bike?.color || "",
            modelYear: bike?.modelYear || "",
            modality: bike?.modality || "",
            appraisedValue: bike?.appraisedValue || 0,
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
            if (!response.ok) {
                throw new Error('La respuesta de la red no fue correcta');
            }
            const data = await response.json();
            setSerialExists(!data.isUnique);
        } catch (error) {
            console.error("Error checking serial number:", error);
            setSerialExists(false);
            toast({
                title: "Error de Validación",
                description: "No se pudo verificar el número de serie. Inténtalo de nuevo.",
                variant: "destructive",
            });
        } finally {
            setIsCheckingSerial(false);
        }
    }, 500), [isEditing, bike?.serialNumber, toast]);

    useEffect(() => {
        if (!state) return;

        if (state.message) {
            toast({
                title: state.success ? "Éxito" : "Error",
                description: state.message,
                variant: state.success ? "default" : "destructive",
            });
            if (state.success) {
                if (onSuccess) {
                    onSuccess();
                } else {
                    router.push('/dashboard');
                }
            }
        }
    }, [state, toast, onSuccess, router]);

    return (
        <Form {...form}>
            <form action={formAction} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{isEditing ? 'Editar Bicicleta' : 'Registrar una Nueva Bicicleta'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {state && state.message && !onSuccess && (
                            <Alert variant={state.success ? "default" : "destructive"}>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>{state.success ? 'Éxito' : 'Error'}</AlertTitle>
                                <AlertDescription>{state.message}</AlertDescription>
                            </Alert>
                        )}

                        <FormField
                            control={form.control}
                            name="serialNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <RequiredLabel>Número de Serie</RequiredLabel>
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
                                        <RequiredLabel>Marca</RequiredLabel>
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
                                <FormItem><RequiredLabel>Modelo</RequiredLabel><FormControl><Input placeholder="ej., Marlin 5" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="modelYear" render={({ field }) => (
                                <FormItem><FormLabel>Año Modelo</FormLabel><FormControl><Input placeholder="ej., 2023" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="color" render={({ field }) => (
                                <FormItem><RequiredLabel>Color Principal</RequiredLabel><FormControl><Input placeholder="ej., Azul" {...field} /></FormControl><FormMessage /></FormItem>
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
                        
                        <FormField
                            control={form.control}
                            name="appraisedValue"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valor Aproximado (MXN)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="ej., 15000" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-6 pt-4">
                            <h4 className="font-medium text-base border-b pb-2">Fotografías</h4>
                            <div className="space-y-2">
                                <Label>Foto Lateral <span className="text-red-500">*</span></Label>
                                <ImageUpload onUploadSuccess={setPhotoUrl} storagePath="bike-photos" disabled={!authUser} />
                                <p className="text-xs text-muted-foreground">Toma una foto completa del costado de tu bicicleta.</p>
                                {state?.errors?.photoUrl && (
                                    <p className="text-sm font-medium text-destructive">
                                        {state.errors.photoUrl[0]}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Foto de Número de Serie <span className="text-red-500">*</span></Label>
                                <ImageUpload onUploadSuccess={setSerialNumberPhotoUrl} storagePath="serial-photos" disabled={!authUser} />
                                <p className="text-xs text-muted-foreground">Toma una foto clara y legible del número de serie.</p>
                                {state?.errors?.serialNumberPhotoUrl && (
                                    <p className="text-sm font-medium text-destructive">
                                        {state.errors.serialNumberPhotoUrl[0]}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Foto Adicional 1 (Componentes)</Label>
                                <ImageUpload onUploadSuccess={setAdditionalPhoto1Url} storagePath="bike-photos" disabled={!authUser} />
                                <p className="text-xs text-muted-foreground">Foto de alguna modificación o componente específico.</p>
                            </div>
                             <div className="space-y-2">
                                <Label>Foto Adicional 2 (Seña Particular)</Label>
                                <ImageUpload onUploadSuccess={setAdditionalPhoto2Url} storagePath="bike-photos" disabled={!authUser} />
                                <p className="text-xs text-muted-foreground">Foto de alguna otra seña particular o componente.</p>
                            </div>
                        </div>
                        
                        <div className="space-y-2 pt-4">
                            <Label>Prueba de Propiedad</Label>
                            <ImageUpload onUploadSuccess={setOwnershipProofUrl} storagePath={`ownership-proofs/${userId}`} disabled={!authUser} />
                            <p className="text-xs text-muted-foreground">Sube la factura, recibo o alguna otra prueba de propiedad (opcional).</p>
                        </div>
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
