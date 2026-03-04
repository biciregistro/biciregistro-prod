'use client';

import { useState, useEffect } from 'react';
import { UseFormReturn } from "react-hook-form";
import { FormLabel, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { ImageUpload } from '@/components/shared/image-upload';
import { X, Info, AlertCircle } from 'lucide-react';
import Image from "next/image";
import { z } from "zod";
import { eventFormSchema } from '@/lib/schemas';
import type { FinancialSettings, OngUser } from '@/lib/types';
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DEFAULT_WAIVER_TEXT } from '@/lib/legal-constants';

import { ConfigurationSection } from '../event-form-sections/configuration-section';
import { CostSection } from '../event-form-sections/cost-section';
import { CustomQuestionsSection } from '../event-form-sections/custom-questions-section';

type EventFormValues = z.infer<typeof eventFormSchema>;

interface StepProps {
    form: UseFormReturn<EventFormValues>;
    financialSettings: FinancialSettings;
    hasFinancialData: boolean;
    ongProfile?: Partial<OngUser>;
    isPublished?: boolean;
}

export function StepThreeConfiguration({ form, financialSettings, hasFinancialData, ongProfile, isPublished }: StepProps) {
    const [uploadKey, setUploadKey] = useState(0);
    const requiresWaiver = form.watch('requiresWaiver');
    const waiverText = form.watch('waiverText');

     useEffect(() => {
        if (requiresWaiver && !waiverText) {
            form.setValue('waiverText', DEFAULT_WAIVER_TEXT);
        }
    }, [requiresWaiver, waiverText, form]);


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
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            {/* Sponsors Section */}
            <div className="space-y-4 border rounded-lg p-4 bg-muted/5">
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

            <ConfigurationSection 
                form={form} 
                isPublished={isPublished} 
                isWizardMode={true} 
            />
            
            <CustomQuestionsSection form={form} />
            
            {/* Custom Waiver Logic */}
            {requiresWaiver && (
                <div className="space-y-4 border rounded-lg p-4 bg-muted/5 mt-6 animate-in fade-in slide-in-from-top-2">
                     <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium">Carta Responsiva</h3>
                            <p className="text-sm text-muted-foreground">Configura el texto legal que firmarán los participantes.</p>
                        </div>
                    </div>
                    
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
                                <FormControl>
                                    <Textarea 
                                        placeholder="Escribe o pega aquí el texto legal..." 
                                        className="min-h-[300px] font-mono text-sm leading-relaxed" 
                                        {...field} 
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}


            <CostSection 
                form={form} 
                financialSettings={financialSettings} 
                hasFinancialData={hasFinancialData} 
                ongProfile={ongProfile}
                isWizardMode={true}
            />
        </div>
    );
}
