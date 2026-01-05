// src/components/admin/landing-editor/solution-form.tsx
'use client';

import React, { useActionState, useEffect } from 'react';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { landingEventsSolutionSectionSchema } from '@/lib/schemas/landing-events';
import { updateSolutionSection } from '@/lib/actions/landing-events-actions';
import { LandingEventsContent } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/shared/image-upload';

type SolutionData = LandingEventsContent['solutionSection'];

interface SolutionFormProps {
  initialData: SolutionData;
}

export function SolutionForm({ initialData }: SolutionFormProps) {
  const { toast } = useToast();

  const methods = useForm<SolutionData>({
    resolver: zodResolver(landingEventsSolutionSectionSchema),
    defaultValues: initialData,
  });

  const { control, formState: { isDirty, isSubmitting } } = methods;
  const { fields } = useFieldArray({
    control,
    name: "solutions",
  });

  const [state, formAction] = useActionState(updateSolutionSection, null);

  useEffect(() => {
    if (state?.success) {
      toast({ title: "Soluciones guardadas", description: state.message });
      methods.reset(methods.getValues());
    } else if (state?.message) {
      toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast, methods]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>3. La Solución (Ejes Estratégicos)</CardTitle>
      </CardHeader>
      <CardContent>
         <FormProvider {...methods}>
            <form action={formAction} id="solution-form" className="space-y-6">
                <FormField
                control={control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Título de la Sección</FormLabel>
                    <FormControl>
                        <Input placeholder="El Nuevo Estándar en Gestión de Eventos..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="space-y-4 rounded-md border p-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="space-y-8 border-b pb-6 last:border-0 last:pb-0">
                    <h4 className="font-semibold text-lg">Eje #{index + 1}</h4>
                     {/* Updated hidden input to use dot notation */}
                     <input type="hidden" name={`solutions.${index}.id`} value={field.id} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <FormField
                                control={control}
                                name={`solutions.${index}.title` as any}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título</FormLabel>
                                    <FormControl>
                                    <Input {...field} value={field.value as string} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`solutions.${index}.description` as any}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                    <Textarea {...field} value={field.value as string} rows={4} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={control}
                            name={`solutions.${index}.imageUrl` as any}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>GIF o Imagen Ilustrativa</FormLabel>
                                <FormControl>
                                    <div className="space-y-3">
                                        <ImageUpload 
                                            onUploadSuccess={(url) => field.onChange(url)}
                                            storagePath="landing-events/solutions"
                                            buttonText="Cargar Archivo"
                                        />
                                        <Input 
                                            {...field} 
                                            value={field.value as string || ''} 
                                            placeholder="URL del archivo" 
                                            className="text-xs"
                                        />
                                        {field.value && (
                                            <div className="mt-2 relative aspect-video w-full overflow-hidden rounded-md border bg-muted group">
                                                <img 
                                                    src={field.value as string} 
                                                    alt="Vista previa" 
                                                    className="object-cover w-full h-full transition-transform group-hover:scale-105" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    </div>
                ))}
                </div>
            </form>
         </FormProvider>
      </CardContent>
      <CardFooter className="justify-end border-t pt-6">
            <Button 
                type="submit" 
                form="solution-form" 
                disabled={isSubmitting || !isDirty}
            >
                {isSubmitting ? 'Guardando...' : 'Guardar Soluciones'}
            </Button>
      </CardFooter>
    </Card>
  );
}
