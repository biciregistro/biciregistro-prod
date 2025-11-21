'use client';

import { useTransition } from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from 'next/navigation';

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
import { useState } from 'react';

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

export function EventForm() {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();
    
    // State for location selectors
    const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(countries.find(c => c.name === 'México'));
    const [states, setStates] = useState<string[]>(selectedCountry?.states || []);

    // Cost toggle state
    const [isCostEnabled, setIsCostEnabled] = useState(false);

    const form = useForm<EventFormValues>({
        resolver: zodResolver(eventFormSchema),
        defaultValues: {
            name: "",
            eventType: undefined,
            date: "",
            country: "México",
            state: "",
            modality: "",
            description: "",
            imageUrl: "",
            googleMapsUrl: "",
            level: undefined,
            distance: 0,
            costType: "Gratuito",
            paymentDetails: "",
            costTiers: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "costTiers",
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
            // Data is already synced with the form state
            const result = await saveEvent(data, isDraft);

            if (result?.success) {
                toast({
                    title: isDraft ? "Borrador Guardado" : "Evento Publicado",
                    description: result.message,
                });
                router.push('/dashboard/ong');
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        onClick={() => append({ id: crypto.randomUUID(), name: '', price: 0, includes: '' })}
                                    >
                                        <PlusCircle className="mr-2 h-3 w-3" /> Agregar Nivel
                                    </Button>
                                </div>
                                
                                {fields.map((field, index) => (
                                    <Card key={field.id}>
                                        <CardContent className="p-4 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-sm font-semibold">Nivel {index + 1}</h4>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
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
                                {fields.length === 0 && (
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
