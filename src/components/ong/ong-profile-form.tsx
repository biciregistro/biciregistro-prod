'use client';

import { useState } from 'react';
import { useForm, UseFormReturn, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/shared/image-upload';
import { countries } from '@/lib/countries';
import { getCities } from '@/lib/cities';
import { ongProfileSchema } from '@/lib/schemas';
import { z } from "zod";
import { Loader2 } from 'lucide-react';
import type { OngUser } from '@/lib/types';
import { updateOngProfile } from '@/lib/actions/ong-actions';
import { useToast } from '@/hooks/use-toast';

type OngProfileFormValues = z.infer<typeof ongProfileSchema>;

export function OngProfileForm({ initialData }: { initialData?: Partial<OngUser> }) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    // Ensure default values are robust, matching the new Google Maps URL requirement
    const form = useForm<OngProfileFormValues>({
        resolver: zodResolver(ongProfileSchema),
        defaultValues: {
            organizationName: initialData?.organizationName || "",
            contactPerson: initialData?.contactPerson || "",
            organizationWhatsapp: initialData?.organizationWhatsapp || "",
            contactWhatsapp: initialData?.contactWhatsapp || "",
            websiteUrl: initialData?.websiteUrl || "",
            instagramUrl: initialData?.instagramUrl || "",
            facebookUrl: initialData?.facebookUrl || "",
            googleMapsUrl: initialData?.googleMapsUrl || "", // NUEVO
            country: initialData?.country || "México",
            state: initialData?.state || "",
            logoUrl: initialData?.logoUrl || "",
            coverUrl: initialData?.coverUrl || "",
            description: initialData?.description || "",
        },
    });

    const watchedCountry = form.watch('country');
    const selectedCountry = countries.find(c => c.name === watchedCountry);
    const states = selectedCountry?.states || [];

    const handleCountryChange = (countryName: string) => {
        form.setValue('country', countryName);
        form.setValue('state', ''); 
    };

    const handleLogoUpload = (url: string) => form.setValue('logoUrl', url);
    const handleCoverUpload = (url: string) => form.setValue('coverUrl', url);

    async function onSubmit(data: OngProfileFormValues) {
        setIsSaving(true);
        try {
            const result = await updateOngProfile(data);
            if (result.success) {
                toast({ title: "Perfil actualizado", description: result.message });
            } else {
                toast({ variant: "destructive", title: "Error", description: result.message });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error inesperado", description: "Ocurrió un problema al guardar." });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Identidad Visual</CardTitle>
                        <CardDescription>Logotipo y portada pública de tu organización.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <FormLabel>Logotipo de la Organización</FormLabel>
                                <ImageUpload 
                                    onUploadSuccess={handleLogoUpload} 
                                    storagePath="ong-logos" 
                                    initialImageUrl={form.getValues('logoUrl')}
                                    guidelinesText="Recomendado: Cuadrado, min 200x200px"
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                    Sugerencia: Puedes utilizar la misma imagen de perfil de tus redes sociales.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <FormLabel>Imagen de Portada</FormLabel>
                                <ImageUpload 
                                    onUploadSuccess={handleCoverUpload} 
                                    storagePath="ong-covers" 
                                    initialImageUrl={form.getValues('coverUrl')}
                                    guidelinesText="Recomendado: 1920x1080px (16:9)"
                                />
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción / Acerca de Nosotros</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="Cuéntale a la comunidad quiénes son, su misión y qué tipo de eventos organizan..." 
                                            className="min-h-[100px]" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Información General</CardTitle>
                        <CardDescription>Datos principales y de contacto.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="organizationName" render={({ field }) => (
                            <FormItem><FormLabel>Nombre de la Organización</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="contactPerson" render={({ field }) => (
                            <FormItem><FormLabel>Persona de Contacto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="organizationWhatsapp" render={({ field }) => (
                            <FormItem><FormLabel>WhatsApp Organización (Público)</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="contactWhatsapp" render={({ field }) => (
                            <FormItem><FormLabel>WhatsApp Contacto (Privado)</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        
                        <FormField control={form.control} name="country" render={({ field }) => (
                            <FormItem>
                                <FormLabel>País</FormLabel>
                                <Select onValueChange={handleCountryChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un país" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {countries.map((c) => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="state" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Estado / Región</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={states.length === 0}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un estado" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Presencia Digital</CardTitle>
                        <CardDescription>Enlaces a tus sitios y redes sociales.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="websiteUrl" render={({ field }) => (
                            <FormItem><FormLabel>Sitio Web</FormLabel><FormControl><Input placeholder="https://" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="facebookUrl" render={({ field }) => (
                            <FormItem><FormLabel>Facebook</FormLabel><FormControl><Input placeholder="https://facebook.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="instagramUrl" render={({ field }) => (
                            <FormItem><FormLabel>Instagram</FormLabel><FormControl><Input placeholder="https://instagram.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="googleMapsUrl" render={({ field }) => (
                            <FormItem><FormLabel>Ubicación Física (Google Maps)</FormLabel><FormControl><Input placeholder="https://maps.app.goo.gl/..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                    <CardFooter className="bg-muted/20 py-4 mt-6">
                        <Button type="submit" disabled={isSaving} className="ml-auto min-w-[150px]">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Cambios
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </FormProvider>
    );
}
