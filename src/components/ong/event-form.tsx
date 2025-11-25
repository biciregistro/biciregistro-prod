'use client';

import { useTransition, useState, useEffect } from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, usePathname } from 'next/navigation';

import { eventFormSchema } from '@/lib/schemas';
import { saveEvent } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from '@/components/ui/card';
import { ImageUpload } from '@/components/shared/image-upload';
import { countries, type Country } from '@/lib/countries';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import type { Event } from '@/lib/types';

// Required label helper
const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <span>
    {children} <span className="text-red-500">*</span>
  </span>
);

type EventFormValues = z.infer<typeof eventFormSchema>;

const modalityOptions = ["Urbana", "Gravel", "Pista", "XC", "Enduro", "Downhill", "Trail", "E-Bike", "Dirt Jump", "MTB", "Ruta"];
const eventTypes = ['Rodada', 'Competencia', 'Taller', 'Conferencia'];
const levels = ['Principiante', 'Intermedio', 'Avanzado'];

interface EventFormProps {
    initialData?: Event;
}

export function EventForm({ initialData }: EventFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    
    // Initialize location state based on initial data or default
    const defaultCountryName = initialData?.country || 'México';
    const defaultCountry = countries.find(c => c.name === defaultCountryName);
    
    const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(defaultCountry);
    const [states, setStates] = useState<string[]>(defaultCountry?.states || []);

    // Toggles state
    const [isCostEnabled, setIsCostEnabled] = useState(initialData?.costType === 'Con Costo');
    const [hasCategories, setHasCategories] = useState(initialData?.hasCategories || false);
    const [hasDeadline, setHasDeadline] = useState(initialData?.hasRegistrationDeadline || false);

    const form = useForm<EventFormValues>({
        resolver: zodResolver(eventFormSchema),
        defaultValues: {
            name: initialData?.name || "",
            eventType: initialData?.eventType as any || undefined,
            // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
            date: initialData?.date ? new Date(initialData.date).toISOString().slice(0, 16) : "",
            country: initialData?.country || "México",
            state: initialData?.state || "",
            modality: initialData?.modality || "",
            description: initialData?.description || "",
            imageUrl: initialData?.imageUrl || "",
            googleMapsUrl: initialData?.googleMapsUrl || "",
            level: initialData?.level as any || undefined,
            distance: initialData?.distance || 0,
            costType: initialData?.costType as any || "Gratuito",
            paymentDetails: initialData?.paymentDetails || "",
            costTiers: initialData?.costTiers || [],
            maxParticipants: initialData?.maxParticipants || 0,
            hasCategories: initialData?.hasCategories || false,
            categories: initialData?.categories || [],
            hasRegistrationDeadline: initialData?.hasRegistrationDeadline || false,
            registrationDeadline: initialData?.registrationDeadline ? new Date(initialData.registrationDeadline).toISOString().slice(0, 16) : "",
        },
    });

    const { fields: costFields, append: appendCost, remove: removeCost } = useFieldArray({
        control: form.control,
        name: "costTiers",
    });

    const { fields: categoryFields, append: appendCategory, remove: removeCategory } = useFieldArray({
        control: form.control,
        name: "categories",
    });

    const handleCountryChange = (countryName: string) => {
        const country = countries.find(c => c.name === countryName);
        setSelectedCountry(country);
        setStates(country?.states || []);
        form.setValue('country', countryName);
        form.setValue('state', ''); 
    };

    const onSubmit = async (data: EventFormValues, isDraft: boolean) => {
        startTransition(async () => {
            // Merge form data with ID if editing
            const submitData = { 
                ...data, 
                id: initialData?.id 
            };
            
            // Cleanup data based on toggles before sending
            if (!isCostEnabled) {
                submitData.costTiers = [];
                submitData.paymentDetails = undefined;
                submitData.costType = 'Gratuito';
            }

            if (!hasCategories) {
                submitData.categories = [];
                submitData.hasCategories = false;
            }

            if (!hasDeadline) {
                submitData.registrationDeadline = undefined;
                submitData.hasRegistrationDeadline = false;
            }
            
            const result = await saveEvent(submitData, isDraft);

            if (result?.success) {
                toast({
                    title: isDraft ? "Borrador Guardado" : "Evento Publicado",
                    description: result.message,
                });
                
                // Dynamic redirection based on user role/path
                if (pathname.startsWith('/admin')) {
                    router.push('/admin?tab=events');
                } else {
                    router.push('/dashboard/ong');
                }
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result?.error || "Hubo un problema al guardar el evento.",
                });
            }
        });
    };

    const onError = (errors: any) => {
        console.log("Errores de validación:", errors);
        toast({
            variant: "destructive",
            title: "Faltan campos obligatorios",
            description: "Por favor, revisa el formulario y completa los campos marcados en rojo.",
        });
    };

    return (
        <Form {...form}>
            <form className="space-y-8">
                {/* Image Upload */}
                <div className="space-y-2">
                    <FormLabel>Imagen de Portada (Opcional)</FormLabel>
                    <div className="p-4 border rounded-md bg-muted/10">
                        {initialData?.imageUrl && (
                            <p className="text-xs text-muted-foreground mb-2">Imagen actual guardada. Sube una nueva para reemplazarla.</p>
                        )}
                        <ImageUpload 
                            onUploadSuccess={(url) => form.setValue('imageUrl', url)} 
                            storagePath="event-covers" 
                        />
                    </div>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel><RequiredLabel>Nombre del Evento</RequiredLabel></FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej. Rodada Nocturna de Verano" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="eventType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel><RequiredLabel>Tipo de Evento</RequiredLabel></FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un tipo" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {eventTypes.map((type) => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel><RequiredLabel>Fecha y Hora</RequiredLabel></FormLabel>
                                <FormControl>
                                    <Input type="datetime-local" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="modality"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel><RequiredLabel>Modalidad</RequiredLabel></FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona una modalidad" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {modalityOptions.map((mod) => (
                                            <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel><RequiredLabel>País</RequiredLabel></FormLabel>
                                <Select onValueChange={handleCountryChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un país" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {countries.map((c) => (
                                            <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
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
                                <FormLabel><RequiredLabel>Estado / Ciudad</RequiredLabel></FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedCountry}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un estado" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {states.map((s) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="googleMapsUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Link de Google Maps (Ubicación Exacta)</FormLabel>
                            <FormControl>
                                <Input placeholder="https://maps.app.goo.gl/..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Description */}
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel><RequiredLabel>Descripción del Evento</RequiredLabel></FormLabel>
                            <FormControl>
                                <Textarea 
                                    placeholder="Describe los detalles, agenda, requisitos y lo que hace especial a tu evento..." 
                                    className="min-h-[150px]"
                                    {...field} 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Technical Details (Optional) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                        control={form.control}
                        name="level"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nivel de Dificultad</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un nivel" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {levels.map((l) => (
                                            <SelectItem key={l} value={l}>{l}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="distance"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Distancia (km)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Ej. 45" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="maxParticipants"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cupo Máximo</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="number" 
                                        placeholder="0 para ilimitado" 
                                        {...field} 
                                        onChange={e => field.onChange(e.target.value === '' ? 0 : parseInt(e.target.value))}
                                    />
                                </FormControl>
                                <FormDescription>Dejar en 0 o vacío para cupo ilimitado.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Registration Deadline Config */}
                <div className="space-y-4 border rounded-lg p-4 bg-muted/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium">Cierre de Inscripciones</h3>
                            <p className="text-sm text-muted-foreground">¿Este evento tiene una fecha límite para inscribirse?</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <FormLabel className="font-normal cursor-pointer" htmlFor="deadline-toggle">
                                {hasDeadline ? "Sí" : "No"}
                            </FormLabel>
                            <Switch
                                id="deadline-toggle"
                                checked={hasDeadline}
                                onCheckedChange={(checked) => {
                                    setHasDeadline(checked);
                                    form.setValue('hasRegistrationDeadline', checked);
                                    if (!checked) {
                                        form.setValue('registrationDeadline', '');
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {hasDeadline && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                            <FormField
                                control={form.control}
                                name="registrationDeadline"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel><RequiredLabel>Fecha y Hora Límite</RequiredLabel></FormLabel>
                                        <FormControl>
                                            <Input type="datetime-local" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Después de esta fecha, el botón de registro se deshabilitará automáticamente.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}
                </div>

                {/* Categories Configuration */}
                <div className="space-y-4 border rounded-lg p-4 bg-muted/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium">Configuración de Categorías</h3>
                            <p className="text-sm text-muted-foreground">¿El evento se divide por categorías (ej. Elite, Master)?</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <FormLabel className="font-normal cursor-pointer" htmlFor="categories-toggle">
                                {hasCategories ? "Sí" : "No"}
                            </FormLabel>
                            <Switch
                                id="categories-toggle"
                                checked={hasCategories}
                                onCheckedChange={(checked) => {
                                    setHasCategories(checked);
                                    form.setValue('hasCategories', checked);
                                    if (!checked) {
                                        form.setValue('categories', []);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {hasCategories && (
                        <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center justify-between">
                                <FormLabel>Lista de Categorías</FormLabel>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => appendCategory({ id: crypto.randomUUID(), name: '', description: '' })}
                                >
                                    <PlusCircle className="mr-2 h-3 w-3" /> Agregar Categoría
                                </Button>
                            </div>
                            
                            {categoryFields.map((field, index) => (
                                <Card key={field.id}>
                                    <CardContent className="p-4 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-sm font-semibold">Categoría {index + 1}</h4>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeCategory(index)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name={`categories.${index}.name`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Nombre (Ej. Elite Varonil)</FormLabel>
                                                        <FormControl><Input {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`categories.${index}.description`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Descripción / Requisitos (Opcional)</FormLabel>
                                                        <FormControl><Input placeholder="Ej. 18-35 años" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            
                            {categoryFields.length === 0 && (
                                <p className="text-sm text-destructive text-center py-4">
                                    Debes agregar al menos una categoría si la opción está habilitada.
                                </p>
                            )}
                            
                            {form.formState.errors.categories && (
                                <p className="text-sm font-medium text-destructive">
                                    {form.formState.errors.categories.message}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Costs & Tiers */}
                <div className="space-y-4 border rounded-lg p-4 bg-muted/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium">Configuración de Costos</h3>
                            <p className="text-sm text-muted-foreground">¿El evento tiene costo de inscripción?</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <FormLabel className="font-normal cursor-pointer" htmlFor="cost-mode">
                                {isCostEnabled ? "Con Costo" : "Gratuito"}
                            </FormLabel>
                            <Switch
                                id="cost-mode"
                                checked={isCostEnabled}
                                onCheckedChange={(checked) => {
                                    setIsCostEnabled(checked);
                                    form.setValue('costType', checked ? 'Con Costo' : 'Gratuito');
                                    if (!checked) {
                                        // Clear cost tiers if switching to free
                                        form.setValue('costTiers', []);
                                        form.setValue('paymentDetails', '');
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {isCostEnabled && (
                        <div className="space-y-6 mt-4 animate-in fade-in slide-in-from-top-2">
                            <FormField
                                control={form.control}
                                name="paymentDetails"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Detalles de Pago / Transferencia</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Instrucciones para realizar el pago (CLABE, banco, etc.)" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <FormLabel>Niveles de Acceso (Tiers)</FormLabel>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => appendCost({ id: crypto.randomUUID(), name: '', price: 0, includes: '' })}
                                    >
                                        <PlusCircle className="mr-2 h-3 w-3" /> Agregar Nivel
                                    </Button>
                                </div>
                                
                                {costFields.map((field, index) => (
                                    <Card key={field.id}>
                                        <CardContent className="p-4 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-sm font-semibold">Nivel {index + 1}</h4>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeCost(index)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name={`costTiers.${index}.name`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs">Nombre (Ej. General, VIP)</FormLabel>
                                                            <FormControl><Input {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`costTiers.${index}.price`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs">Precio (MXN)</FormLabel>
                                                            <FormControl><Input type="number" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name={`costTiers.${index}.includes`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">¿Qué incluye?</FormLabel>
                                                        <FormControl><Input placeholder="Ej. Jersey, medalla, hidratación" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </CardContent>
                                    </Card>
                                ))}
                                {costFields.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Agrega al menos un nivel de precio si el evento tiene costo.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full sm:w-auto"
                        onClick={form.handleSubmit((data) => onSubmit(data, true), onError)}
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Guardar Borrador
                    </Button>
                    <Button 
                        type="button" 
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                        onClick={form.handleSubmit((data) => onSubmit(data, false), onError)}
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Publicar Evento
                    </Button>
                </div>
            </form>
        </Form>
    );
}
