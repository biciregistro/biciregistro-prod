'use client';

import { useState, useEffect } from 'react';
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/shared/image-upload';
import { countries } from '@/lib/countries';
import { X } from 'lucide-react';
import Image from "next/image";
import { eventFormSchema } from '@/lib/schemas';
import { z } from "zod";

type EventFormValues = z.infer<typeof eventFormSchema>;

interface GeneralSectionProps {
    form: UseFormReturn<EventFormValues>;
}

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <span>
    {children} <span className="text-red-500">*</span>
  </span>
);

const modalityOptions = ["Urbana", "Gravel", "Pista", "XC", "Enduro", "Downhill", "Trail", "E-Bike", "Dirt Jump", "MTB", "Ruta"];
const eventTypes = ['Rodada', 'Competencia', 'Taller', 'Conferencia'];
const levels = ['Principiante', 'Intermedio', 'Avanzado'];

export function GeneralSection({ form }: GeneralSectionProps) {
    const [uploadKey, setUploadKey] = useState(0);
    const [currentStates, setCurrentStates] = useState<string[]>([]);
    
    const selectedCountryName = form.watch('country');

    useEffect(() => {
        const country = countries.find(c => c.name === selectedCountryName);
        setCurrentStates(country?.states || []);
    }, [selectedCountryName]);

    const handleCountryChange = (countryName: string) => {
        form.setValue('country', countryName);
        form.setValue('state', ''); 
    };
    
    const handleSponsorUpload = (url: string) => {
        const currentSponsors = form.getValues('sponsors') || [];
        form.setValue('sponsors', [...currentSponsors, url]);
        setUploadKey(prev => prev + 1);
    };

    const removeSponsor = (index: number) => {
        const currentSponsors = form.getValues('sponsors') || [];
        const newSponsors = currentSponsors.filter((_, i) => i !== index);
        form.setValue('sponsors', newSponsors);
    };

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <FormLabel>Imagen de Portada (Opcional)</FormLabel>
                <div className="p-4 border rounded-md bg-muted/10">
                    {form.watch('imageUrl') && (
                        <p className="text-xs text-muted-foreground mb-2">Imagen actual guardada. Sube una nueva para reemplazarla.</p>
                    )}
                    <ImageUpload 
                        onUploadSuccess={(url) => form.setValue('imageUrl', url)} 
                        storagePath="event-covers" 
                    />
                </div>
            </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel><RequiredLabel>País</RequiredLabel></FormLabel>
                            <Select onValueChange={handleCountryChange} value={field.value}>
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
                            <Select onValueChange={field.onChange} value={field.value} disabled={currentStates.length === 0}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un estado" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {currentStates.map((s) => (
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

            <div className="space-y-4 border rounded-lg p-4 bg-muted/5 mt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium">Patrocinadores</h3>
                        <p className="text-sm text-muted-foreground">Agrega los logotipos de las marcas que apoyan tu evento.</p>
                    </div>
                </div>

                <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {form.watch('sponsors')?.map((url, index) => (
                            <div key={index} className="relative group border rounded-md overflow-hidden bg-background">
                                <div className="relative aspect-square">
                                    <Image
                                        src={url}
                                        alt={`Patrocinador ${index + 1}`}
                                        fill
                                        className="object-contain p-2"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeSponsor(index)}
                                    className="absolute top-1 right-1 p-1 bg-destructive/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border border-dashed rounded-md bg-background/50">
                        <FormLabel className="mb-2 block">Agregar Nuevo Patrocinador</FormLabel>
                        <ImageUpload
                            key={uploadKey}
                            onUploadSuccess={handleSponsorUpload}
                            storagePath="event-sponsors"
                            guidelinesText="Recomendado: Imágenes cuadradas o apaisadas, fondo transparente, máx 2MB."
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
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
        </div>
    );
}
