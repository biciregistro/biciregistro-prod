'use client';

import { useFieldArray, useWatch, UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, AlertCircle } from 'lucide-react';
import { eventFormSchema } from '@/lib/schemas';
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

    const hasDeadline = useWatch({ control: form.control, name: "hasRegistrationDeadline" });
    const requiresBike = useWatch({ control: form.control, name: "requiresBike" });
    const requiresEmergency = useWatch({ control: form.control, name: "requiresEmergencyContact" });
    const hasCategories = useWatch({ control: form.control, name: "hasCategories" });
    const bibEnabled = useWatch({ control: form.control, name: "bibNumberConfig.enabled" });

    // Handle initial state for bibNumberConfig if it doesn't exist yet
    // This is useful when editing existing events that don't have this field
    // or when creating a new event
    
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
        </div>
    );
}
