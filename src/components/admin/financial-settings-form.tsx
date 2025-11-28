'use client';

import { useState, useTransition } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from '@/hooks/use-toast';
import { saveFinancialSettingsAction } from '@/lib/actions';
import { financialSettingsSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save } from 'lucide-react';
import type { FinancialSettings } from '@/lib/types';

interface FinancialSettingsFormProps {
    initialSettings: FinancialSettings;
}

export function FinancialSettingsForm({ initialSettings }: FinancialSettingsFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof financialSettingsSchema>>({
        resolver: zodResolver(financialSettingsSchema),
        defaultValues: initialSettings,
    });

    const onSubmit = (data: z.infer<typeof financialSettingsSchema>) => {
        startTransition(async () => {
            const result = await saveFinancialSettingsAction(null, new FormData()); 
            // NOTE: FormData is tricky with client-side validation first.
            // Better to pass plain object to action or reconstruct formData.
            // Let's adjust action call.
            
            const formData = new FormData();
            Object.entries(data).forEach(([key, value]) => {
                formData.append(key, value.toString());
            });

            const response = await saveFinancialSettingsAction(null, formData);

            if (response?.success) {
                toast({
                    title: "Configuración Actualizada",
                    description: "Los parámetros financieros han sido guardados.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: response?.error || "No se pudo actualizar la configuración.",
                });
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Parámetros Financieros (Gross-up)</CardTitle>
                <CardDescription>
                    Define las tasas utilizadas para calcular el precio final de los eventos.
                    Cualquier cambio afectará a los nuevos eventos creados o editados.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="commissionRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Comisión BiciRegistro (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.1" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Porcentaje que cobra la plataforma sobre el monto neto.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="ivaRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tasa de IVA (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="1" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Impuesto al Valor Agregado aplicable (Generalmente 16%).
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="pasarelaRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Comisión Pasarela (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.1" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Tasa variable de MercadoPago (Ej. 3.5%).
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="pasarelaFixed"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fijo Pasarela ($ MXN)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.5" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Monto fijo por transacción (Ej. $4.00 + IVA).
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={isPending}>
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Guardar Configuración
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
