'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/shared/image-upload';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { countries } from '@/lib/countries';
import { getCities } from '@/lib/cities';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, ArrowLeft, Building2, Globe, Landmark, FileText, CheckCircle2, Upload, ExternalLink } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/client";

// Zod Schemas
import { wizardStep1Schema, wizardStep2Schema, wizardStep3Schema } from '@/lib/schemas';
import { saveOnboardingStep, completeOngOnboarding } from '@/lib/actions/ong-actions';

interface WizardProps {
    initialStep: number;
    initialData: any;
    userName: string;
    userId: string; // Recibimos el userId para la ruta segura del PDF
}

export function OngWizardClient({ initialStep, initialData, userName, userId }: WizardProps) {
    const [currentStep, setCurrentStep] = useState(initialStep);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { toast } = useToast();

    // ----------------------------------------------------------------------
    // STEP 1 FORM (Identity)
    // ----------------------------------------------------------------------
    const form1 = useForm({
        resolver: zodResolver(wizardStep1Schema),
        defaultValues: {
            organizationName: initialData.organizationName || "",
            contactPerson: initialData.contactPerson || userName, // Pre-fill with Auth name
            country: initialData.country || "México",
            state: initialData.state || "",
            organizationWhatsapp: initialData.organizationWhatsapp || "",
            contactWhatsapp: initialData.contactWhatsapp || "",
            googleMapsUrl: initialData.googleMapsUrl || "",
        },
    });

    const watchedCountry = form1.watch('country');
    const selectedCountry = countries.find(c => c.name === watchedCountry);
    const states = selectedCountry?.states || [];

    const handleCountryChange = (countryName: string) => {
        form1.setValue('country', countryName);
        form1.setValue('state', ''); 
    };

    const onSubmitStep1 = async (data: any) => {
        startTransition(async () => {
            const res = await saveOnboardingStep(1, data);
            if (res.success) {
                setCurrentStep(2);
                window.scrollTo(0, 0);
            } else {
                toast({ variant: "destructive", title: "Error", description: res.error });
            }
        });
    };

    // ----------------------------------------------------------------------
    // STEP 2 FORM (Brand & Digital)
    // ----------------------------------------------------------------------
    const form2 = useForm({
        resolver: zodResolver(wizardStep2Schema),
        defaultValues: {
            logoUrl: initialData.logoUrl || "",
            coverUrl: initialData.coverUrl || "",
            description: initialData.description || "",
            websiteUrl: initialData.websiteUrl || "",
            facebookUrl: initialData.facebookUrl || "",
            instagramUrl: initialData.instagramUrl || "",
        },
    });

    const handleLogoUpload = (url: string) => form2.setValue('logoUrl', url);
    const handleCoverUpload = (url: string) => form2.setValue('coverUrl', url);

    const onSubmitStep2 = async (data: any) => {
        startTransition(async () => {
            const res = await saveOnboardingStep(2, data);
            if (res.success) {
                setCurrentStep(3);
                window.scrollTo(0, 0);
            } else {
                toast({ variant: "destructive", title: "Error", description: res.error });
            }
        });
    };

    // ----------------------------------------------------------------------
    // STEP 3 FORM (Financial)
    // ----------------------------------------------------------------------
    const hasExistingCost = initialData.financialData ? true : false;
    
    const form3 = useForm({
        resolver: zodResolver(wizardStep3Schema),
        defaultValues: {
            hasCost: hasExistingCost,
            bankName: initialData.financialData?.bankName || "",
            accountHolder: initialData.financialData?.accountHolder || "",
            clabe: initialData.financialData?.clabe || "",
            constanciaFiscalUrl: initialData.financialData?.constanciaFiscalUrl || "",
        },
    });

    const hasCost = form3.watch("hasCost");
    const [isUploadingPdf, setIsUploadingPdf] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(form3.getValues('constanciaFiscalUrl'));

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast({ variant: "destructive", title: "Formato inválido", description: "Debes subir un archivo PDF." });
            return;
        }

        setIsUploadingPdf(true);
        try {
            // APLICAMOS LA RUTA SEGURA CON EL ID DEL USUARIO
            const fileName = `constancias-fiscales/${userId}/wizard_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const storageRef = ref(storage, fileName);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on("state_changed", null, 
                (error) => {
                    setIsUploadingPdf(false);
                    toast({ variant: "destructive", title: "Error al subir", description: "No se pudo procesar el documento. Revisa tus permisos." });
                },
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    setPdfUrl(url);
                    form3.setValue('constanciaFiscalUrl', url, { shouldValidate: true });
                    setIsUploadingPdf(false);
                }
            );
        } catch (error) {
            setIsUploadingPdf(false);
        }
    };

    const onSubmitStep3 = async (data: any) => {
        startTransition(async () => {
            // Guardamos el paso 3
            const resSave = await saveOnboardingStep(3, data);
            if (!resSave.success) {
                toast({ variant: "destructive", title: "Error", description: resSave.error });
                return;
            }
            
            // Finalizamos y transmutamos identidad
            const resComplete = await completeOngOnboarding();
            if (resComplete.success) {
                toast({ title: "¡Bienvenido!", description: "Tu perfil comercial está listo." });
                router.push('/dashboard/ong');
            } else {
                toast({ variant: "destructive", title: "Error", description: resComplete.error });
            }
        });
    };


    // ----------------------------------------------------------------------
    // RENDERING
    // ----------------------------------------------------------------------
    return (
        <div className="w-full">
            {/* PROGRESS BAR */}
            <div className="mb-8 flex items-center justify-between">
                {[1, 2, 3].map((step) => (
                    <div key={step} className="flex flex-col items-center gap-2 relative z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors ${
                            currentStep === step ? 'bg-primary text-white border-primary' : 
                            currentStep > step ? 'bg-primary/20 text-primary border-primary' : 
                            'bg-muted text-muted-foreground border-muted-foreground/30'
                        }`}>
                            {currentStep > step ? <CheckCircle2 className="w-5 h-5" /> : step}
                        </div>
                        <span className={`text-xs font-semibold ${currentStep === step ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {step === 1 ? 'Identidad' : step === 2 ? 'Marca' : 'Finanzas'}
                        </span>
                    </div>
                ))}
                <div className="absolute top-5 left-10 right-10 h-[2px] bg-muted-foreground/20 -z-0 hidden sm:block">
                     <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(currentStep - 1) * 50}%` }} />
                </div>
            </div>

            {/* STEP 1 */}
            {currentStep === 1 && (
                <Card className="animate-in fade-in slide-in-from-right-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Identidad de tu Organización</CardTitle>
                        <CardDescription>Esta información será pública y ayudará a los ciclistas a ubicarte.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form1}>
                            <form onSubmit={form1.handleSubmit(onSubmitStep1)} className="space-y-6">
                                <FormField control={form1.control} name="organizationName" render={({ field }) => (
                                    <FormItem><FormLabel>Nombre Oficial o Comercial de tu Organización</FormLabel><FormControl><Input placeholder="Ej. Rodadas Extremas A.C." {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form1.control} name="contactPerson" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre del Responsable / Contacto</FormLabel>
                                        <FormDescription>Lo hemos llenado con tu nombre de registro, pero puedes cambiarlo.</FormDescription>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form1.control} name="organizationWhatsapp" render={({ field }) => (
                                        <FormItem><FormLabel>WhatsApp de la Organización (Público)</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form1.control} name="contactWhatsapp" render={({ field }) => (
                                        <FormItem><FormLabel>Tu WhatsApp Directo (Privado para BiciRegistro)</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField control={form1.control} name="country" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>País Sede</FormLabel>
                                            <Select onValueChange={handleCountryChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecciona país" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {countries.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form1.control} name="state" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estado Principal de Operación</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={states.length === 0}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <FormField control={form1.control} name="googleMapsUrl" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ubicación / Punto de Encuentro (Google Maps)</FormLabel>
                                        <FormDescription>Pega el link de Google Maps de tu base o tienda si tienes una.</FormDescription>
                                        <FormControl><Input placeholder="https://maps.app.goo.gl/..." {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="flex justify-end pt-4 border-t">
                                    <Button type="submit" disabled={isPending}>
                                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Siguiente"}
                                        {!isPending && <ArrowRight className="ml-2 h-4 w-4" />}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            )}

            {/* STEP 2 */}
            {currentStep === 2 && (
                 <Card className="animate-in fade-in slide-in-from-right-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> Presencia Digital</CardTitle>
                        <CardDescription>Configura cómo te verán los usuarios dentro de BiciRegistro.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form2}>
                            <form onSubmit={form2.handleSubmit(onSubmitStep2)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <FormLabel>Logotipo Oficial</FormLabel>
                                        <ImageUpload 
                                            onUploadSuccess={handleLogoUpload} 
                                            storagePath="ong-logos" 
                                            initialImageUrl={form2.getValues('logoUrl')}
                                            guidelinesText="Usa el mismo de Facebook. Min 200x200px"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <FormLabel>Imagen de Portada (Opcional)</FormLabel>
                                        <ImageUpload 
                                            onUploadSuccess={handleCoverUpload} 
                                            storagePath="ong-covers" 
                                            initialImageUrl={form2.getValues('coverUrl')}
                                            guidelinesText="Horizontal 1920x1080px (16:9)"
                                        />
                                    </div>
                                </div>

                                <FormField control={form2.control} name="description" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Acerca de Nosotros</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Cuéntale a la comunidad quiénes son y qué tipo de eventos organizan..." className="min-h-[100px]" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField control={form2.control} name="facebookUrl" render={({ field }) => (
                                        <FormItem><FormLabel>Página de Facebook</FormLabel><FormControl><Input placeholder="https://facebook.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form2.control} name="instagramUrl" render={({ field }) => (
                                        <FormItem><FormLabel>Perfil de Instagram</FormLabel><FormControl><Input placeholder="https://instagram.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                     <FormField control={form2.control} name="websiteUrl" render={({ field }) => (
                                        <FormItem className="md:col-span-2"><FormLabel>Sitio Web Oficial</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>

                                <div className="flex justify-between pt-4 border-t">
                                    <Button type="button" variant="ghost" onClick={() => setCurrentStep(1)} disabled={isPending}>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                                    </Button>
                                    <Button type="submit" disabled={isPending}>
                                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Siguiente"}
                                        {!isPending && <ArrowRight className="ml-2 h-4 w-4" />}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            )}

            {/* STEP 3 */}
            {currentStep === 3 && (
                <Card className="animate-in fade-in slide-in-from-right-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Landmark className="w-5 h-5 text-primary" /> Modelo Operativo</CardTitle>
                        <CardDescription>Para facturación y transferencia de fondos (Split de Pagos).</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Form {...form3}>
                            <form onSubmit={form3.handleSubmit(onSubmitStep3)} className="space-y-6">
                                
                                <FormField control={form3.control} name="hasCost" render={({ field }) => (
                                    <FormItem className="space-y-3 p-4 border rounded-lg bg-muted/20">
                                        <FormLabel className="text-base font-semibold">¿Realizarás eventos con cobro de inscripción?</FormLabel>
                                        <FormDescription>Podrás crear eventos gratuitos en cualquier momento.</FormDescription>
                                        <FormControl>
                                            <RadioGroup 
                                                onValueChange={(val) => field.onChange(val === 'true')} 
                                                value={field.value ? 'true' : 'false'} 
                                                className="flex flex-col space-y-2"
                                            >
                                                <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md cursor-pointer hover:bg-background transition-colors">
                                                    <FormControl><RadioGroupItem value="false" /></FormControl>
                                                    <FormLabel className="font-normal text-base cursor-pointer">Mis eventos serán 100% gratuitos.</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0 p-3 border rounded-md cursor-pointer hover:bg-background transition-colors">
                                                    <FormControl><RadioGroupItem value="true" /></FormControl>
                                                    <FormLabel className="font-normal text-base cursor-pointer">Sí, cobraré cuota de inscripción a los ciclistas.</FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {hasCost && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form3.control} name="bankName" render={({ field }) => (
                                                <FormItem><FormLabel>Banco Destino</FormLabel><FormControl><Input placeholder="Ej. BBVA, Santander" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form3.control} name="accountHolder" render={({ field }) => (
                                                <FormItem><FormLabel>Titular de la Cuenta</FormLabel><FormControl><Input placeholder="Nombre oficial en el banco" {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form3.control} name="clabe" render={({ field }) => (
                                                <FormItem className="md:col-span-2"><FormLabel>Cuenta CLABE (18 dígitos)</FormLabel><FormControl><Input className="font-mono tracking-widest" maxLength={18} {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>

                                        <div className="bg-blue-50/50 dark:bg-blue-950/20 p-5 rounded-lg border border-blue-200 dark:border-blue-900">
                                            <div className="mb-4">
                                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                                    <FileText className="h-4 w-4" /> Constancia de Situación Fiscal (PDF)
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-1">Como plataforma Marketplace, requerimos tu constancia vigente para facturar las comisiones de uso de plataforma que se descuentan en cada pago.</p>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                                 <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    onClick={() => document.getElementById('wizard-pdf-upload')?.click()}
                                                    disabled={isUploadingPdf}
                                                    className="w-full sm:w-auto"
                                                >
                                                    {isUploadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                                    {pdfUrl ? 'Cambiar PDF' : 'Subir Archivo PDF'}
                                                </Button>
                                                <input 
                                                    id="wizard-pdf-upload"
                                                    type="file" 
                                                    accept=".pdf,application/pdf" 
                                                    className="hidden" 
                                                    onChange={handlePdfUpload}
                                                />
                                                {pdfUrl ? (
                                                    <span className="text-sm text-green-600 font-medium flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4" /> Documento cargado exitosamente
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground italic">Campo obligatorio*</span>
                                                )}
                                            </div>
                                            {/* Hidden field so Zod picks it up */}
                                            <FormField control={form3.control} name="constanciaFiscalUrl" render={({ field }) => (
                                                 <FormItem className="hidden"><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between pt-4 border-t">
                                    <Button type="button" variant="ghost" onClick={() => setCurrentStep(2)} disabled={isPending}>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                                    </Button>
                                    <Button type="submit" disabled={isPending} className="bg-green-600 hover:bg-green-700">
                                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Finalizar y Comenzar a Operar"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}
