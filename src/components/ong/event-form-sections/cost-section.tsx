'use client';

import { useFieldArray, useWatch, Control, UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from '@/components/ui/button';
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Trash2, Calculator } from 'lucide-react';
import { calculateGrossUp, calculateFeeBreakdown } from '@/lib/utils';
import type { FinancialSettings } from '@/lib/types';
import { eventFormSchema } from '@/lib/schemas';
import { z } from "zod";

type EventFormValues = z.infer<typeof eventFormSchema>;

interface CostSectionProps {
    form: UseFormReturn<EventFormValues>;
    financialSettings: FinancialSettings;
}

const CostTierCalculator = ({ index, control, settings }: { index: number, control: Control<EventFormValues>, settings: FinancialSettings }) => {
    const netPrice = useWatch({
        control,
        name: `costTiers.${index}.price` as any, 
    });

    const netValue = Number(netPrice);

    if (!netPrice || isNaN(netValue) || netValue <= 0) return null;

    const grossPrice = calculateGrossUp(netValue, settings);
    const breakdown = calculateFeeBreakdown(grossPrice, netValue);

    return (
        <div className="mt-3 text-xs bg-muted/50 p-3 rounded-md border border-dashed animate-in fade-in slide-in-from-top-1">
             <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <Calculator className="h-3 w-3" />
                <span className="font-semibold">Desglose Financiero</span>
            </div>
            <div className="grid gap-1">
                <div className="flex justify-between">
                    <span>Tú recibes (Neto):</span>
                    <span className="font-medium text-green-600">${netValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                    <span>Comisión Plataforma + Pasarela + IVA:</span>
                    <span>${breakdown.feeAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1 mt-1 font-bold">
                    <span>Precio Final al Ciclista:</span>
                    <span className="text-primary">${grossPrice.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
};

export function CostSection({ form, financialSettings }: CostSectionProps) {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "costTiers",
    });

    const isCostEnabled = useWatch({
        control: form.control,
        name: "costType",
    }) === 'Con Costo';

    const handleToggle = (checked: boolean) => {
        form.setValue('costType', checked ? 'Con Costo' : 'Gratuito');
        if (!checked) {
            form.setValue('costTiers', []);
            form.setValue('paymentDetails', '');
        }
    };

    return (
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
                                        <div className="space-y-2">
                                            <FormField
                                                control={form.control}
                                                name={`costTiers.${index}.price`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Precio NETO (Lo que tú recibes)</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                                                <Input 
                                                                    type="number" 
                                                                    className="pl-7" 
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
    );
}
