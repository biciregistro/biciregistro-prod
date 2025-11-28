'use client';

import { useTransition } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from '@/hooks/use-toast';
import { saveOngFinancialsAction } from '@/lib/actions';
import { financialProfileSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, CreditCard } from 'lucide-react';

type FinancialFormValues = z.infer<typeof financialProfileSchema>;

interface OngFinancialFormProps {
    initialData?: FinancialFormValues;
}

export function OngFinancialForm({ initialData }: OngFinancialFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<FinancialFormValues>({
        resolver: zodResolver(financialProfileSchema),
        defaultValues: initialData || {
            bankName: "",
            accountHolder: "",
            clabe: "",
        },
    });

    const onSubmit = (data: FinancialFormValues) => {
        startTransition(async () => {
            const formData = new FormData();
            Object.entries(data).forEach(([key, value]) => {
                formData.append(key, value);
            });

            const result = await saveOngFinancialsAction(null, formData);

            if (result?.success) {
                toast({
                    title: "Datos Bancarios Guardados",
                    description: "La información para dispersión de pagos ha sido actualizada.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result?.error || "Hubo un problema al guardar los datos.",
                });
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <CardTitle>Datos Bancarios para Dispersión</CardTitle>
                </div>
                <CardDescription>
                    Ingresa la cuenta donde deseas recibir los fondos recaudados de tus eventos de pago.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="bankName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Banco</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej. BBVA, Santander" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="accountHolder"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre del Beneficiario</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nombre del titular de la cuenta" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        <FormField
                            control={form.control}
                            name="clabe"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CLABE Interbancaria</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="18 dígitos" 
                                            maxLength={18} 
                                            {...field} 
                                            onChange={(e) => {
                                                // Allow only numbers
                                                const val = e.target.value.replace(/\D/g, '');
                                                field.onChange(val);
                                            }}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Clave Bancaria Estandarizada de 18 dígitos.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={isPending}>
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Guardar Datos Bancarios
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
