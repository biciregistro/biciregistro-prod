'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateSerialAction } from '@/lib/actions/serial-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { ImageUpload } from '@/components/shared/image-upload';
import type { Serial } from '@/lib/types';

const editSerialSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  description: z.string().min(10, "La descripción es muy corta"),
  guideUrl: z.string().url("Debe ser una URL válida (ej. PDF en Drive)").optional().or(z.literal('')),
  heroImageUrl: z.string().min(1, "La foto de portada es obligatoria"),
  status: z.enum(['draft', 'published', 'completed']),
});

type EditSerialFormValues = z.infer<typeof editSerialSchema>;

interface SerialEditTabProps {
    serial: Serial;
}

export function SerialEditTab({ serial }: SerialEditTabProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const form = useForm<EditSerialFormValues>({
        resolver: zodResolver(editSerialSchema),
        defaultValues: {
            name: serial.name || '',
            description: serial.description || '',
            guideUrl: serial.guideUrl || '',
            heroImageUrl: serial.heroImageUrl || '',
            status: serial.status || 'published',
        }
    });

    async function onSubmit(data: EditSerialFormValues) {
        setIsSubmitting(true);
        try {
            const result = await updateSerialAction(serial.id, data);
            
            if (result.success) {
                toast({
                    title: "Campeonato actualizado",
                    description: "Los cambios se han guardado correctamente.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Error al guardar",
                    description: result.error || "Ocurrió un error inesperado.",
                });
            }
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Error",
                description: "Ocurrió un error al procesar la solicitud.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuración General</CardTitle>
                <CardDescription>
                    Modifica los metadatos públicos del campeonato. Los cambios estructurales como categorías y fechas deben gestionarse desde cada etapa individualmente.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
                        
                        <FormField
                            control={form.control}
                            name="heroImageUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Foto de Portada del Campeonato</FormLabel>
                                    <FormControl>
                                        <ImageUpload
                                            initialImageUrl={field.value || undefined}
                                            onUploadSuccess={(url) => field.onChange(url)}
                                            storagePath="serials"
                                        />
                                    </FormControl>
                                    <FormDescription>Esta imagen será la portada del campeonato (ratio recomendado 16:9).</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre del Campeonato</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción General</FormLabel>
                                    <FormControl>
                                        <Textarea className="min-h-[120px]" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Estado Público</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona el estado" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="draft">Borrador (Oculto)</SelectItem>
                                                <SelectItem value="published">Publicado (Activo)</SelectItem>
                                                <SelectItem value="completed">Finalizado (Histórico)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="guideUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Reglamento Oficial (URL)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md flex gap-3 text-sm mt-8">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p>
                                <strong>Nota estructural:</strong> La modalidad base ({serial.modality}) y las categorías globales 
                                no pueden editarse desde este panel general para preservar la integridad de las inscripciones actuales.
                            </p>
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                            <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700 text-white min-w-[150px]">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Guardar Cambios
                                    </>
                                )}
                            </Button>
                        </div>

                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
