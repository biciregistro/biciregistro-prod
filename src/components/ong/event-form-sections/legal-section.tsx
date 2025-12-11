'use client';

import { UseFormReturn, useWatch } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertCircle } from 'lucide-react';
import { eventFormSchema } from '@/lib/schemas';
import { z } from "zod";
import { useEffect } from 'react';
import { DEFAULT_WAIVER_TEXT } from '@/lib/legal-constants';

type EventFormValues = z.infer<typeof eventFormSchema>;

interface LegalSectionProps {
    form: UseFormReturn<EventFormValues>;
}

export function LegalSection({ form }: LegalSectionProps) {
    const requiresWaiver = useWatch({ control: form.control, name: "requiresWaiver" });
    const waiverText = useWatch({ control: form.control, name: "waiverText" });

    // Efecto para pre-llenar el texto si se activa el switch y está vacío
    useEffect(() => {
        if (requiresWaiver && !waiverText) {
            form.setValue('waiverText', DEFAULT_WAIVER_TEXT);
        }
    }, [requiresWaiver, waiverText, form]);

    return (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/5 mt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Legal</h3>
                    <p className="text-sm text-muted-foreground">Configuración de carta responsiva y términos legales.</p>
                </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
                <div>
                    <FormLabel className="font-normal cursor-pointer text-base" htmlFor="waiver-toggle">
                        ¿Solicitar Carta Responsiva Digital?
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                        Si activas esto, los participantes deberán firmar digitalmente una responsiva antes de completar su registro.
                    </p>
                </div>
                <FormField
                    control={form.control}
                    name="requiresWaiver"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Switch
                                    id="waiver-toggle"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>

            {requiresWaiver && (
                <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                    <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertTitle className="text-blue-800 dark:text-blue-300">Variables Dinámicas</AlertTitle>
                        <AlertDescription className="text-blue-700 dark:text-blue-400/80 mt-1 text-xs">
                            El sistema reemplazará automáticamente los siguientes marcadores con los datos reales:
                            <ul className="list-disc list-inside mt-1 font-mono">
                                <li>[NOMBRE DEL PARTICIPANTE]</li>
                                <li>[NOMBRE DEL EVENTO]</li>
                                <li>[NOMBRE DEL ORGANIZADOR / RAZÓN SOCIAL]</li>
                            </ul>
                        </AlertDescription>
                    </Alert>

                    <FormField
                        control={form.control}
                        name="waiverText"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Texto de la Carta Responsiva</FormLabel>
                                <FormControl>
                                    <Textarea 
                                        placeholder="Escribe o pega aquí el texto legal..." 
                                        className="min-h-[300px] font-mono text-sm leading-relaxed" 
                                        {...field} 
                                    />
                                </FormControl>
                                <FormDescription>
                                    Este es el texto que el usuario leerá y aceptará. Asegúrate de que sea legalmente válido en tu jurisdicción.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <Alert variant="destructive" className="text-xs">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Advertencia Legal</AlertTitle>
                        <AlertDescription>
                            BiciRegistro provee un texto estándar (plantilla), pero no ofrece asesoría legal. Te recomendamos que un abogado revise este documento antes de publicar el evento.
                        </AlertDescription>
                    </Alert>
                </div>
            )}
        </div>
    );
}
