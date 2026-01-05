'use client';

import { useState, useEffect } from 'react';
import { useFieldArray, useWatch, Control, UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, Calculator } from 'lucide-react';
import { calculateGrossUp, calculateFeeBreakdown, calculateAbsorbedFee } from '@/lib/utils';
import type { FinancialSettings, OngUser } from '@/lib/types';
import { eventFormSchema } from '@/lib/schemas';
import { z } from "zod";
import { FinancialRegistrationModal } from '../financial-registration-modal';

type EventFormValues = z.infer<typeof eventFormSchema>;

interface CostSectionProps {
    form: UseFormReturn<EventFormValues>;
    financialSettings: FinancialSettings;
    hasFinancialData: boolean;
    ongProfile?: Partial<OngUser>;
}

const CostTierCalculator = ({ index, control, settings }: { index: number, control: Control<EventFormValues>, settings: FinancialSettings }) => {
    const inputValue = useWatch({
        control,
        name: `costTiers.${index}.price` as any, 
    });
    
    const absorbFee = useWatch({
        control,
        name: `costTiers.${index}.absorbFee` as any,
    });

    const val = Number(inputValue);

    if (!inputValue || isNaN(val) || val <= 0) return null;

    let displayNet: number;
    let displayFee: number;
    let displayTotal: number;

    if (absorbFee) {
        const breakdown = calculateAbsorbedFee(val, settings);
        displayTotal = val;
        displayNet = breakdown.netAmount;
        displayFee = breakdown.feeAmount;
    } else {
        displayTotal = calculateGrossUp(val, settings);
        const breakdown = calculateFeeBreakdown(displayTotal, val);
        displayNet = val;
        displayFee = breakdown.feeAmount;
    }

    return (
        <div className="mt-3 text-xs bg-muted/50 p-3 rounded-md border border-dashed animate-in fade-in slide-in-from-top-1">
             <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <Calculator className="h-3 w-3" />
                <span className="font-semibold">Desglose Financiero</span>
            </div>
            <div className="grid gap-1">
                <div className="flex justify-between">
                    <span>Tú recibes (Neto):</span>
                    <span className="font-medium text-green-600">${displayNet.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                    <span>Comisión Plataforma + Pasarela + IVA:</span>
                    <span>${displayFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 mt-1 font-bold">
                    <span>Precio Final al Ciclista:</span>
                    <span className="text-primary">${displayTotal.toFixed(2)}</span>
                </div>
            </div>
            {absorbFee && (
                 <p className="mt-2 text-[10px] text-blue-600 italic">
                    * Estás absorbiendo los cargos. El precio al público es fijo.
                 </p>
            )}
        </div>
    );
};

export function CostSection({ form, financialSettings, hasFinancialData: initialHasFinancialData, ongProfile }: CostSectionProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [localHasFinancialData, setLocalHasFinancialData] = useState(initialHasFinancialData);

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "costTiers",
    });

    const isCostEnabled = useWatch({
        control: form.control,
        name: "costType",
    }) === 'Con Costo';

    const handleToggle = (checked: boolean) => {
        if (checked && !localHasFinancialData) {
            setIsModalOpen(true);
            return;
        }

        form.setValue('costType', checked ? 'Con Costo' : 'Gratuito');
        if (!checked) {
            form.setValue('costTiers', []);
            form.setValue('paymentDetails', '');
        }
    };
    
    const handleFinancialSuccess = () => {
        setLocalHasFinancialData(true);
        setIsModalOpen(false);
        form.setValue('costType', 'Con Costo');
    };

    return (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/5">
            {ongProfile && (
                <FinancialRegistrationModal
                    isOpen={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    onSuccess={handleFinancialSuccess}
                    ongProfile={ongProfile}
                />
            )}

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
                        onCheckedChange={handleToggle}
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
                                onClick={() => append({ id: crypto.randomUUID(), name: '', price: 0, includes: '', absorbFee: false })}
                            >
                                <PlusCircle className="mr-2 h-3 w-3" /> Agregar Nivel
                            </Button>
                        </div>
                        
                        {fields.map((field, index) => {
                            const isAbsorbed = form.watch(`costTiers.${index}.absorbFee`);
                            
                            return (
                                <Card key={field.id} className="border-2 border-muted/20">
                                    <CardContent className="p-4 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-sm font-semibold">Nivel {index + 1}</h4>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Column 1: Info & Includes */}
                                            <div className="space-y-4">
                                                <FormField
                                                    control={form.control}
                                                    name={`costTiers.${index}.name`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs uppercase tracking-wider font-bold">Nombre del Nivel</FormLabel>
                                                            <FormControl><Input placeholder="Ej. General o Preventa" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`costTiers.${index}.includes`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs uppercase tracking-wider font-bold">¿Qué incluye?</FormLabel>
                                                            <FormControl><Input placeholder="Playera, medalla..." {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            {/* Column 2: Pricing & Strategy */}
                                            <div className="space-y-4 bg-secondary/20 p-4 rounded-lg border border-secondary">
                                                <FormField
                                                    control={form.control}
                                                    name={`costTiers.${index}.absorbFee`}
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center justify-between rounded-md border bg-background p-2 shadow-sm mb-2">
                                                            <div className="space-y-0.5">
                                                                <FormLabel className="text-xs font-semibold">Absorber Comisión</FormLabel>
                                                                <FormDescription className="text-[10px] leading-tight">
                                                                    La ONG paga los cargos. El precio al público es exacto.
                                                                </FormDescription>
                                                            </div>
                                                            <FormControl>
                                                                <Switch
                                                                    checked={field.value}
                                                                    onCheckedChange={field.onChange}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name={`costTiers.${index}.price`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs font-bold text-primary italic">
                                                                {isAbsorbed ? "PRECIO FINAL AL PÚBLICO" : "TU META NETA (LO QUE RECIBES)"}
                                                            </FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-2.5 text-muted-foreground font-bold">$</span>
                                                                    <Input 
                                                                        type="number" 
                                                                        className="pl-7 font-bold text-lg" 
                                                                        {...field}
                                                                        onChange={e => field.onChange(parseFloat(e.target.value))}
                                                                    />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <CostTierCalculator index={index} control={form.control} settings={financialSettings} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {fields.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Agrega al menos un nivel de precio si el evento tiene costo.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
