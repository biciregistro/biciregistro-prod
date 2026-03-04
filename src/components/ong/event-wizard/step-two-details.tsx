'use client';

import { useState, useEffect } from 'react';
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { countries } from '@/lib/countries';
import { eventFormSchema } from '@/lib/schemas';
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, Upload, X, ImageIcon } from 'lucide-react';
import Image from "next/image";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";

type EventFormValues = z.infer<typeof eventFormSchema>;

interface StepProps {
    form: UseFormReturn<EventFormValues>;
}

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <span>
    {children} <span className="text-red-500">*</span>
  </span>
);

const modalityOptions = ["Urbana", "Gravel", "Pista", "XC", "Enduro", "Downhill", "Trail", "E-Bike", "Dirt Jump", "MTB", "Ruta"];
const levels = ['Principiante', 'Intermedio', 'Avanzado'];

export function StepTwoDetails({ form }: StepProps) {
    const [currentStates, setCurrentStates] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();
    
    const selectedCountryName = form.watch('country');
    const requiresEmergency = form.watch('requiresEmergencyContact');
    const requiresBike = form.watch('requiresBike');
    const requiresWaiver = form.watch('requiresWaiver');
    const imageUrl = form.watch('imageUrl');

    useEffect(() => {
        const country = countries.find(c => c.name === selectedCountryName);
        setCurrentStates(country?.states || []);
    }, [selectedCountryName]);

    const handleCountryChange = (countryName: string) => {
        form.setValue('country', countryName);
        form.setValue('state', ''); 
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
             toast({
                variant: "destructive",
                title: "Archivo muy grande",
                description: "La imagen no debe exceder los 5MB."
            });
             return;
        }

        setIsUploading(true);
        
        try {
            const fileName = `event-covers/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, fileName);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                () => {}, 
                (error) => {
                    console.error(error);
                    setIsUploading(false);
                    toast({
                        variant: "destructive",
                        title: "Error al subir",
                        description: "No se pudo cargar la imagen. Intenta de nuevo."
                    });
                },
                () => {
                    getDownloadURL(uploadTask.snapshot.ref).then((url) => {
                        form.setValue('imageUrl', url);
                        setIsUploading(false);
                    });
                }
            );
        } catch (error) {
            console.error(error);
            setIsUploading(false);
            toast({
                variant: "destructive",
                title: "Error inesperado",
                description: "Ocurrió un error al procesar la imagen."
            });
        }
    };

    const clearImage = () => {
        form.setValue('imageUrl', '');
    };
    
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
             <div className="space-y-2">
                <FormLabel>Imagen de Portada (Opcional)</FormLabel>
                
                <div className="space-y-3">
                    {!imageUrl && !isUploading ? (
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="event-cover-input" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 border-muted-foreground/25 transition-colors group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <div className="p-4 bg-background rounded-full shadow-sm group-hover:scale-110 transition-transform mb-3">
                                        <Upload className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-foreground font-medium text-center">Toca para subir portada</p>
                                    <p className="text-xs text-muted-foreground mt-1 text-center">Recomendado: 1920x1080px (16:9)</p>
                                </div>
                                <Input
                                    id="event-cover-input"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageChange}
                                />
                            </label>
                        </div>
                    ) : (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted flex items-center justify-center group">
                             {isUploading ? (
                                 <div className="flex flex-col items-center gap-3 text-muted-foreground animate-in fade-in duration-300">
                                     <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                     <span className="text-sm font-medium">Subiendo imagen...</span>
                                 </div>
                             ) : (
                                <>
                                    {imageUrl && (
                                        <Image 
                                            src={imageUrl} 
                                            alt="Portada del evento" 
                                            fill 
                                            className="object-cover" 
                                        />
                                    )}
                                    
                                    {/* Overlay con acciones */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                         <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={clearImage}
                                            className="h-9 gap-2"
                                        >
                                            <X className="w-4 h-4" /> Eliminar
                                        </Button>
                                    </div>

                                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm pointer-events-none">
                                        <ImageIcon className="w-3 h-3" /> Portada cargada
                                    </div>
                                </>
                             )}
                        </div>
                    )}
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
            </div>

            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel><RequiredLabel>Descripción del Evento</RequiredLabel></FormLabel>
                        <FormControl>
                            <Textarea 
                                placeholder="Describe los detalles, agenda, requisitos y lo que hace especial a tu evento..." 
                                className="min-h-[120px]"
                                {...field} 
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <FormField
                    control={form.control}
                    name="modality"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel><RequiredLabel>Modalidad</RequiredLabel></FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona" />
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
                <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nivel</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona" />
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

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
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
                        <FormLabel>Link de Google Maps</FormLabel>
                        <FormControl>
                            <Input placeholder="https://maps.app.goo.gl/..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Requisitos Toggles */}
             <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Requisitos del Evento</h3>
                
                <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/5">
                    <div>
                        <h4 className="font-medium">¿Requiere Bicicleta?</h4>
                        <p className="text-sm text-muted-foreground">¿Es necesario llevar bici propia?</p>
                    </div>
                    <Switch
                        checked={requiresBike}
                        onCheckedChange={(checked) => form.setValue('requiresBike', checked)}
                    />
                </div>

                 <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/5">
                    <div>
                        <h4 className="font-medium">¿Requiere Carta Responsiva?</h4>
                        <p className="text-sm text-muted-foreground">Firma digital obligatoria para participar.</p>
                    </div>
                    <Switch
                        checked={requiresWaiver}
                        onCheckedChange={(checked) => form.setValue('requiresWaiver', checked)}
                    />
                </div>

                <div className="space-y-4 border rounded-lg p-4 bg-muted/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium">¿Solicitar Datos de Emergencia?</h4>
                            <p className="text-sm text-muted-foreground">Contacto, sangre y seguro.</p>
                        </div>
                        <Switch
                            checked={requiresEmergency}
                            onCheckedChange={(checked) => form.setValue('requiresEmergencyContact', checked)}
                        />
                    </div>

                    {requiresEmergency && (
                        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900 text-xs">
                            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <AlertTitle className="text-blue-800 dark:text-blue-300">Aviso de Privacidad</AlertTitle>
                            <AlertDescription className="text-blue-700 dark:text-blue-400/80 mt-1">
                                Estos datos solo son visibles para el organizador hasta 24 hrs después del evento.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </div>
        </div>
    );
}
