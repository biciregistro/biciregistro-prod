'use client';

import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { saveOngFinancialsAction } from '@/lib/actions/ong-actions'; // Asumiré que moveré la acción aquí
import { financialProfileSchema } from '@/lib/schemas';
import type { OngUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Landmark } from 'lucide-react';

type FinancialFormValues = z.infer<typeof financialProfileSchema>;

interface OngFinancialFormProps {
  ongProfile: OngUser;
}

export function OngFinancialForm({ ongProfile }: OngFinancialFormProps) {
    const { toast } = useToast();
    const [isPending, setIsPending] = useState(false);

    const form = useForm<FinancialFormValues>({
        resolver: zodResolver(financialProfileSchema),
        defaultValues: {
            bankName: ongProfile.financialData?.bankName || "",
            accountHolder: ongProfile.financialData?.accountHolder || "",
            clabe: ongProfile.financialData?.clabe || "",
        },
    });

    const onSubmit = async (data: FinancialFormValues) => {
        setIsPending(true);
        // We wrap the server action call to handle the form data conversion properly
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => formData.append(key, value));

        try {
             // Calling the action directly as we are handling client-side state
             // But usually server actions return a plain object
             const result = await saveOngFinancialsAction(null, formData);
             
             if (result?.success) {
                 toast({
                     title: "Datos Guardados",
                     description: result.message,
                 });
             } else {
                 toast({
                     variant: "destructive",
                     title: "Error",
                     description: result?.error || "No se pudieron guardar los datos.",
                 });
             }
        } catch (error) {
            toast({
                 variant: "destructive",
                 title: "Error Inesperado",
                 description: "Ocurrió un problema al conectar con el servidor.",
             });
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-primary" />
                    <CardTitle>Datos Bancarios</CardTitle>
                </div>
                <CardDescription>
                    Esta información es necesaria para transferirte los ingresos generados por tus eventos de pago.
                    Asegúrate de que la cuenta esté a nombre de la organización o representante legal.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="bankName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre del Banco</FormLabel>
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
                                            <Input placeholder="Nombre completo del titular" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="md:col-span-2">
                                <FormField
                                    control={form.control}
                                    name="clabe"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CLABE Interbancaria (18 dígitos)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="012345678901234567" maxLength={18} {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                La CLABE es única para cada cuenta bancaria y consta de 18 dígitos.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isPending}>
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    "Guardar Datos Financieros"
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
