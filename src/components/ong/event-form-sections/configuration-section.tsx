'use client';

import { useFieldArray, useWatch, UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, AlertCircle, Clock, Shirt } from 'lucide-react';
import { eventFormSchema } from '@/lib/schemas';
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type EventFormValues = z.infer<typeof eventFormSchema>;

interface ConfigurationSectionProps {
    form: UseFormReturn<EventFormValues>;
    isPublished?: boolean; // Prop to indicate if the event is already published
}

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <span>
    {children} <span className="text-red-500">*</span>
  </span>
);

export function ConfigurationSection({ form, isPublished }: ConfigurationSectionProps) {
    const { fields: categoryFields, append: appendCategory, remove: removeCategory } = useFieldArray({
        control: form.control,
        name: "categories",
    });

    const { fields: jerseyFields, append: appendJersey, remove: removeJersey } = useFieldArray({
        control: form.control,
        name: "jerseyConfigs",
    });

    const hasDeadline = useWatch({ control: form.control, name: "hasRegistrationDeadline" });
    const requiresBike = useWatch({ control: form.control, name: "requiresBike" });
    const requiresEmergency = useWatch({ control: form.control, name: "requiresEmergencyContact" });
    const hasCategories = useWatch({ control: form.control, name: "hasCategories" });
    const bibEnabled = useWatch({ control: form.control, name: "bibNumberConfig.enabled" });
    const hasJersey = useWatch({ control: form.control, name: "hasJersey" });

    // Watch all categories to handle conditional rendering of age inputs
    const watchedCategories = useWatch({
        control: form.control,
        name: "categories"
    });

    const JERSEY_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
    
    return (
        <div className="space-y-4">
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

            <div className="space-y-4">
                <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/5">
                    <div>
                        <h3 className="text-lg font-medium">Requisitos de Bicicleta</h3>
                        <p className="text-sm text-muted-foreground">¿Es necesario que los participantes lleven bicicleta?</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <FormLabel className="font-normal cursor-pointer" htmlFor="bike-toggle">
                            {requiresBike ? "Sí" : "No"}
                        </FormLabel>
                        <Switch
                            id="bike-toggle"
                            checked={requiresBike}
                            onCheckedChange={(checked) => {
                                form.setValue('requiresBike', checked);
                            }}
                        />
                    </div>
                </div>

                <div className="space-y-4 border rounded-lg p-4 bg-muted/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium">Información de Emergencia</h3>
                            <p className="text-sm text-muted-foreground">¿Solicitar contacto de emergencia, tipo de sangre y seguro?</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <FormLabel className="font-normal cursor-pointer" htmlFor="emergency-toggle">
                                {requiresEmergency ? "Sí" : "No"}
                            </FormLabel>
                            <Switch
                                id="emergency-toggle"
                                checked={requiresEmergency}
                                onCheckedChange={(checked) => {
                                    form.setValue('requiresEmergencyContact', checked);
                                }}
                            />
                        </div>
                    </div>

                    {requiresEmergency && (
                        <Alert className="animate-in fade-in bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900 text-xs">
                            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <AlertTitle className="text-blue-800 dark:text-blue-300">Aviso de Privacidad</AlertTitle>
                            <AlertDescription className="text-blue-700 dark:text-blue-400/80 mt-1">
                                Estos datos están protegidos y sólo estarán visibles para el organizador hasta 24 hrs después del evento, después de este tiempo se eliminarán de su base de información visible.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            </div>

             {/* Bib Number Configuration */}
             <div className="space-y-4 border rounded-lg p-4 bg-muted/5 mt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium">Números de Corredor</h3>
                        <p className="text-sm text-muted-foreground">¿Se asignarán números/dorsales a los participantes?</p>
                        {isPublished && (
                             <p className="text-xs text-amber-600 font-medium">No modificable tras publicación.</p>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <FormLabel className="font-normal cursor-pointer" htmlFor="bib-toggle">
                            {bibEnabled ? "Sí" : "No"}
                        </FormLabel>
                        <FormField
                            control={form.control}
                            name="bibNumberConfig.enabled"
                            render={({ field }) => (
                                <Switch
                                    id="bib-toggle"
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                        field.onChange(checked);
                                        // Reset or set default mode if enabled
                                        if (checked && !form.getValues('bibNumberConfig.mode')) {
                                            form.setValue('bibNumberConfig.mode', 'automatic');
                                        }
                                    }}
                                    disabled={isPublished}
                                />
                            )}
                        />
                    </div>
                </div>

                {bibEnabled && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                         <FormField
                            control={form.control}
                            name="bibNumberConfig.mode"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Modo de Asignación</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex flex-col space-y-1"
                                            disabled={isPublished}
                                        >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="automatic" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    <strong>Automática (Consecutiva):</strong> Se asigna el siguiente número disponible al confirmar el pago.
                                                </FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="dynamic" />
                                                </FormControl>
                                                <FormLabel className="font-normal">
                                                    <strong>Dinámica (Manual):</strong> El staff asigna el número manualmente durante la entrega de kits.
                                                </FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
            </div>

            {/* Jersey Configuration - NEW SECTION */}
            <div className="space-y-4 border rounded-lg p-4 bg-muted/5 mt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium flex items-center gap-2">
                            <Shirt className="h-5 w-5 text-primary" />
                            Jerseys del Evento
                        </h3>
                        <p className="text-sm text-muted-foreground">¿El evento incluye Jersey para los participantes?</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <FormLabel className="font-normal cursor-pointer" htmlFor="jersey-toggle">
                            {hasJersey ? "Sí" : "No"}
                        </FormLabel>
                        <Switch
                            id="jersey-toggle"
                            checked={hasJersey}
                            onCheckedChange={(checked) => {
                                form.setValue('hasJersey', checked);
                                if (!checked) {
                                    form.setValue('jerseyConfigs', []);
                                }
                            }}
                        />
                    </div>
                </div>

                {hasJersey && (
                    <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                            <FormLabel>Modelos Disponibles</FormLabel>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => appendJersey({ 
                                    id: crypto.randomUUID(), 
                                    name: '', 
                                    type: 'Enduro',
                                    sizes: ['S', 'M', 'L'] 
                                })}
                            >
                                <PlusCircle className="mr-2 h-3 w-3" /> Agregar Jersey
                            </Button>
                        </div>
                        
                        {jerseyFields.map((field, index) => (
                            <Card key={field.id} className="overflow-hidden">
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                                        <h4 className="text-sm font-semibold flex items-center gap-2">
                                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px]">
                                                {index + 1}
                                            </span>
                                            Modelo
                                        </h4>
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeJersey(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name={`jerseyConfigs.${index}.name`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs"><RequiredLabel>Nombre del Modelo</RequiredLabel></FormLabel>
                                                        <FormControl><Input placeholder="Ej. Edición Especial 2024" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`jerseyConfigs.${index}.type`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs"><RequiredLabel>Tipo de Corte</RequiredLabel></FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Selecciona un tipo" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="Enduro">Enduro (Holgado)</SelectItem>
                                                                <SelectItem value="XC">XC (Ajustado)</SelectItem>
                                                                <SelectItem value="Ruta">Ruta (Lycra)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <FormLabel className="text-xs"><RequiredLabel>Tallas Disponibles</RequiredLabel></FormLabel>
                                            <div className="grid grid-cols-3 gap-3 p-3 border rounded-md bg-muted/30">
                                                {JERSEY_SIZES.map((size) => (
                                                    <FormField
                                                        key={size}
                                                        control={form.control}
                                                        name={`jerseyConfigs.${index}.sizes`}
                                                        render={({ field }) => {
                                                            return (
                                                                <FormItem
                                                                    key={size}
                                                                    className="flex flex-row items-start space-x-2 space-y-0"
                                                                >
                                                                    <FormControl>
                                                                        <Checkbox
                                                                            checked={field.value?.includes(size)}
                                                                            onCheckedChange={(checked) => {
                                                                                return checked
                                                                                    ? field.onChange([...field.value, size])
                                                                                    : field.onChange(
                                                                                        field.value?.filter(
                                                                                            (value) => value !== size
                                                                                        )
                                                                                    )
                                                                            }}
                                                                        />
                                                                    </FormControl>
                                                                    <FormLabel className="font-normal text-xs cursor-pointer">
                                                                        {size}
                                                                    </FormLabel>
                                                                </FormItem>
                                                            )
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <FormMessage>
                                                {form.formState.errors.jerseyConfigs?.[index]?.sizes?.message}
                                            </FormMessage>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        
                        {jerseyFields.length === 0 && (
                            <p className="text-sm text-destructive text-center py-4">
                                Debes configurar al menos un modelo si la opción está habilitada.
                            </p>
                        )}
                         {form.formState.errors.jerseyConfigs && (
                            <p className="text-sm font-medium text-destructive">
                                {form.formState.errors.jerseyConfigs.message}
                            </p>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-4 border rounded-lg p-4 bg-muted/5 mt-6">
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
                                onClick={() => appendCategory({ 
                                    id: crypto.randomUUID(), 
                                    name: '', 
                                    description: '',
                                    ageConfig: { isRestricted: false, minAge: undefined, maxAge: undefined },
                                    startTime: ''
                                })}
                            >
                                <PlusCircle className="mr-2 h-3 w-3" /> Agregar Categoría
                            </Button>
                        </div>
                        
                        {categoryFields.map((field, index) => {
                            const isAgeRestricted = watchedCategories?.[index]?.ageConfig?.isRestricted;
                            
                            return (
                                <Card key={field.id} className="overflow-hidden">
                                    <CardContent className="p-4 space-y-4">
                                        <div className="flex justify-between items-center border-b pb-2 mb-2">
                                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px]">
                                                    {index + 1}
                                                </span>
                                                Categoría
                                            </h4>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeCategory(index)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Name and Additional Info */}
                                            <div className="space-y-4">
                                                <FormField
                                                    control={form.control}
                                                    name={`categories.${index}.name`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs"><RequiredLabel>Nombre de Categoría</RequiredLabel></FormLabel>
                                                            <FormControl><Input placeholder="Ej. Elite Varonil" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`categories.${index}.description`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs">Información Adicional</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ej. Requisitos especiales, equipo, etc." {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            {/* Age and Time Config */}
                                            <div className="space-y-4 bg-muted/30 p-3 rounded-md border border-dashed">
                                                <div className="flex items-center justify-between">
                                                    <FormLabel className="text-xs font-semibold">Restricción de Edad</FormLabel>
                                                    <FormField
                                                        control={form.control}
                                                        name={`categories.${index}.ageConfig.isRestricted`}
                                                        render={({ field }) => (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-muted-foreground">{field.value ? "Activada" : "N/A (Libre)"}</span>
                                                                <Switch 
                                                                    className="scale-75 origin-right"
                                                                    checked={field.value} 
                                                                    onCheckedChange={field.onChange} 
                                                                />
                                                            </div>
                                                        )}
                                                    />
                                                </div>

                                                {isAgeRestricted ? (
                                                    <div className="grid grid-cols-2 gap-3 animate-in zoom-in-95 duration-200">
                                                        <FormField
                                                            control={form.control}
                                                            name={`categories.${index}.ageConfig.minAge`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[10px]">Edad Mín.</FormLabel>
                                                                    <FormControl>
                                                                        <Input 
                                                                            type="number" 
                                                                            min="0" 
                                                                            {...field} 
                                                                            value={field.value ?? ''} // FIX: Ensure controlled input
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={form.control}
                                                            name={`categories.${index}.ageConfig.maxAge`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[10px]">Edad Máx.</FormLabel>
                                                                    <FormControl>
                                                                        <Input 
                                                                            type="number" 
                                                                            min="0" 
                                                                            {...field} 
                                                                            value={field.value ?? ''} // FIX: Ensure controlled input
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-muted-foreground italic">Cualquier persona puede inscribirse sin importar su edad.</p>
                                                )}

                                                <div className="pt-2 border-t border-muted-foreground/10">
                                                    <FormField
                                                        control={form.control}
                                                        name={`categories.${index}.startTime`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" /> Horario de Salida
                                                                </FormLabel>
                                                                <div className="flex gap-2 items-center">
                                                                    <FormControl className="flex-1">
                                                                        <Input 
                                                                            type="time" 
                                                                            className={cn(!field.value && "text-muted-foreground opacity-60")}
                                                                            {...field} 
                                                                        />
                                                                    </FormControl>
                                                                    {!field.value && (
                                                                        <span className="text-[10px] bg-muted px-2 py-1 rounded border">N/A</span>
                                                                    )}
                                                                </div>
                                                                <FormDescription className="text-[10px]">Dejar vacío si no hay horario específico.</FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                        
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
        </div>
    );
}
