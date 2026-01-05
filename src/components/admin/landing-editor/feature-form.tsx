// src/components/admin/landing-editor/feature-form.tsx
'use client';

import React, { useActionState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { landingEventsFeatureSchema } from '@/lib/schemas/landing-events';
import { updateFeatureSection } from '@/lib/actions/landing-events-actions';
import { LandingEventsFeature } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/shared/image-upload';
import { useToast } from '@/hooks/use-toast';

interface FeatureFormProps {
  initialData: LandingEventsFeature;
}

export function FeatureForm({ initialData }: FeatureFormProps) {
  const { toast } = useToast();

  const methods = useForm<LandingEventsFeature>({
    resolver: zodResolver(landingEventsFeatureSchema),
    defaultValues: initialData,
  });

  const { control, setValue, watch, formState: { isDirty, isSubmitting } } = methods;

  const [state, formAction] = useActionState(updateFeatureSection, null);

  const imageUrl = watch('imageUrl');

  useEffect(() => {
    if (state?.success) {
      toast({ title: "Feature Section guardada", description: state.message });
      methods.reset(methods.getValues());
    } else if (state?.message) {
      toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast, methods]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>4. Killer Feature (Visualización de Data)</CardTitle>
      </CardHeader>
      <CardContent>
         <FormProvider {...methods}>
            <form action={formAction} id="feature-form" className="space-y-6">
                <FormField
                control={control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                        <Input placeholder="¿Sabes cuánto dinero está rodando en tu evento?" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Nosotros sí, y te ayudamos a presentarlo..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                <div className="space-y-4">
                <FormLabel>Imagen o GIF del Dashboard (Mockup)</FormLabel>
                
                {imageUrl && (
                    <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-2">Previsualización:</p>
                        <div className="relative w-full h-64 rounded-md overflow-hidden border bg-muted group">
                            <img 
                                src={imageUrl} 
                                alt="Feature mockup" 
                                className="object-contain w-full h-full transition-transform group-hover:scale-105" 
                            />
                        </div>
                    </div>
                )}

                <ImageUpload
                    storagePath="landing-events/features"
                    onUploadSuccess={(url) => {
                        setValue('imageUrl', url, { shouldDirty: true, shouldValidate: true });
                    }}
                    buttonText="Subir Mockup / GIF"
                    guidelinesText="Recomendado: 1200x800px. Soporta GIF para previsualizaciones animadas."
                />

                <FormField
                    control={control}
                    name="imageUrl"
                    render={({ field }) => (
                    <FormItem className="hidden">
                        <FormControl>
                            <Input {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
            </form>
         </FormProvider>
      </CardContent>
      <CardFooter className="justify-end border-t pt-6">
            <Button 
                type="submit" 
                form="feature-form" 
                disabled={isSubmitting || !isDirty}
            >
                {isSubmitting ? 'Guardando...' : 'Guardar Feature'}
            </Button>
      </CardFooter>
    </Card>
  );
}
