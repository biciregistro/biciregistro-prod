'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { notificationCampaignSchema } from '@/lib/schemas';
import { z } from 'zod';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Send, Users, MessageSquare, History } from 'lucide-react';
import { PreviewPhone } from './preview-phone';
import { estimateAudienceSize, sendNotificationCampaign, getCampaignHistory } from '@/lib/actions/notification-actions';
import { useToast } from '@/hooks/use-toast';
import { CampaignHistory } from './campaign-history';
import { bikeBrands } from '@/lib/bike-brands';
import { modalityOptions } from '@/lib/bike-types';
import { countries } from '@/lib/countries';

const STATES = [
    "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua",
    "Ciudad de México", "Coahuila", "Colima", "Durango", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco",
    "México", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
    "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala",
    "Veracruz", "Yucatán", "Zacatecas"
];

type FormValues = z.infer<typeof notificationCampaignSchema>;

export function NotificationComposer() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("content");
    const [estimatedAudience, setEstimatedAudience] = useState<number | null>(null);
    const [isEstimating, setIsEstimating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    const form = useForm<FormValues>({
        resolver: zodResolver(notificationCampaignSchema),
        defaultValues: {
            title: "",
            body: "",
            link: "",
            filters: {
                targetGroup: 'all',
                country: "México",
            }
        },
        mode: "onChange",
    });

    const watchedFilters = useWatch({
        control: form.control,
        name: "filters",
    });

    const watchedTitle = useWatch({ control: form.control, name: "title" });
    const watchedBody = useWatch({ control: form.control, name: "body" });
    const watchedLink = useWatch({ control: form.control, name: "link" });

    // Load history on mount
    useEffect(() => {
        getCampaignHistory().then(setHistory);
    }, []);

    // Debounced Audience Estimation
    useEffect(() => {
        const timer = setTimeout(async () => {
            setIsEstimating(true);
            try {
                const cleanFilters = JSON.parse(JSON.stringify(watchedFilters));
                const count = await estimateAudienceSize(cleanFilters);
                setEstimatedAudience(count);
            } catch (error) {
                console.error("Failed to estimate audience:", error);
            } finally {
                setIsEstimating(false);
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [watchedFilters]);

    const handleSendClick = async () => {
        const isValid = await form.trigger();
        if (!isValid) {
            toast({
                variant: "destructive",
                title: "Error de validación",
                description: "Por favor revisa los campos del formulario.",
            });
            return;
        }

        if (!estimatedAudience || estimatedAudience === 0) {
            toast({
                variant: "destructive",
                title: "Audiencia vacía",
                description: "No puedes enviar una notificación a 0 usuarios.",
            });
            return;
        }

        setShowConfirmDialog(true);
    };

    const onConfirmSend = async () => {
        setShowConfirmDialog(false);
        setIsSending(true);
        try {
            const data = form.getValues();
            const result = await sendNotificationCampaign(data);
            
            if (result.success) {
                toast({
                    title: "Campaña enviada",
                    description: result.message,
                });
                // Refresh history
                const newHistory = await getCampaignHistory();
                setHistory(newHistory);
                // Reset form partially
                form.reset({
                    ...data,
                    title: "",
                    body: "",
                });
                setActiveTab("content");
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.message,
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error crítico",
                description: "Ocurrió un error inesperado.",
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
                    <Card className="flex-1 flex flex-col border-none shadow-none lg:border lg:shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Nueva Campaña</CardTitle>
                                    <CardDescription>Diseña y envía notificaciones push.</CardDescription>
                                </div>
                                <TabsList>
                                    <TabsTrigger value="content" className="flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" /> Contenido
                                    </TabsTrigger>
                                    <TabsTrigger value="audience" className="flex items-center gap-2">
                                        <Users className="h-4 w-4" /> Audiencia
                                    </TabsTrigger>
                                    <TabsTrigger value="history" className="flex items-center gap-2">
                                        <History className="h-4 w-4" /> Historial
                                    </TabsTrigger>
                                </TabsList>
                            </div>
                        </CardHeader>
                        
                        <CardContent className="flex-1 overflow-y-auto p-6">
                            <Form {...form}>
                                <form className="space-y-6 h-full flex flex-col">
                                    <TabsContent value="content" className="mt-0 space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                        <FormField
                                            control={form.control}
                                            name="title"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Título del Mensaje</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="¡Alerta de seguridad!" {...field} maxLength={100} />
                                                    </FormControl>
                                                    <FormDescription className="text-xs text-right">
                                                        {field.value?.length || 0}/100
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="body"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Cuerpo del Mensaje</FormLabel>
                                                    <FormControl>
                                                        <Textarea 
                                                            placeholder="Escribe el contenido..." 
                                                            className="resize-none h-32"
                                                            maxLength={500}
                                                            {...field} 
                                                        />
                                                    </FormControl>
                                                    <FormDescription className="text-xs text-right">
                                                        {field.value?.length || 0}/500
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="link"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Enlace de Destino (Opcional)</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="https://biciregistro.mx/..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="flex justify-end mt-auto pt-4">
                                            <Button type="button" onClick={() => setActiveTab("audience")}>
                                                Siguiente: Audiencia
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="audience" className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="filters.targetGroup"
                                                render={({ field }) => (
                                                    <FormItem className="col-span-full">
                                                        <FormLabel>Grupo Objetivo</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Selecciona" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="all">Todos los usuarios</SelectItem>
                                                                <SelectItem value="with_bike">Con bicicleta</SelectItem>
                                                                <SelectItem value="without_bike">Sin bicicleta</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="filters.country"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>País</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Cualquiera" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="none">Cualquiera</SelectItem>
                                                                {countries.map((c) => (
                                                                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="filters.state"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Estado</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Cualquiera" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="none">Cualquiera</SelectItem>
                                                                {STATES.map((s) => (
                                                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                            
                                            <FormField
                                                control={form.control}
                                                name="filters.gender"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Género</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Cualquiera" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="none">Cualquiera</SelectItem>
                                                                <SelectItem value="masculino">Masculino</SelectItem>
                                                                <SelectItem value="femenino">Femenino</SelectItem>
                                                                <SelectItem value="otro">Otro</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <Separator />
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                             <FormField
                                                control={form.control}
                                                name="filters.bikeMake"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Marca de Bici</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={watchedFilters.targetGroup === 'without_bike'}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Cualquiera" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="none">Cualquiera</SelectItem>
                                                                {bikeBrands.map((brand: string) => (
                                                                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="filters.bikeModality"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Modalidad</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={watchedFilters.targetGroup === 'without_bike'}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Cualquiera" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="none">Cualquiera</SelectItem>
                                                                {modalityOptions.map((type: string) => (
                                                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <Card className="bg-slate-50 mt-4 border-dashed">
                                            <CardContent className="pt-6 flex flex-col items-center text-center">
                                                {isEstimating ? (
                                                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                                                ) : (
                                                    <span className="text-3xl font-bold text-slate-900">
                                                        {estimatedAudience !== null ? estimatedAudience.toLocaleString() : "-"}
                                                    </span>
                                                )}
                                                <p className="text-sm text-slate-500">Usuarios Estimados</p>
                                            </CardContent>
                                        </Card>

                                        <div className="flex justify-between mt-auto pt-4">
                                            <Button type="button" variant="ghost" onClick={() => setActiveTab("content")}>
                                                Atrás
                                            </Button>
                                            <Button 
                                                type="button"
                                                onClick={handleSendClick}
                                                disabled={isSending || estimatedAudience === 0}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                {isSending ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="mr-2 h-4 w-4" /> Enviar Notificación
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </TabsContent>
                                    
                                    <TabsContent value="history" className="mt-0 h-full">
                                        <CampaignHistory campaigns={history} />
                                    </TabsContent>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </Tabs>
            </div>

            <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col justify-center items-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200 p-8">
                <div className="mb-8 text-center">
                    <h3 className="text-lg font-semibold text-gray-900">Vista Previa</h3>
                    <p className="text-sm text-gray-500">iOS / Android</p>
                </div>
                <PreviewPhone 
                    title={watchedTitle} 
                    body={watchedBody} 
                    link={watchedLink} 
                />
            </div>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Enviar notificación masiva?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Estás a punto de enviar esta notificación a <strong>{estimatedAudience} usuarios</strong>.
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={onConfirmSend} className="bg-green-600 hover:bg-green-700">
                            Confirmar Envío
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
