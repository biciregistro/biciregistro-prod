// src/components/admin/landing-editor/hero-form.tsx
'use client';

import React, { useActionState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form'; // Import FormProvider
import { zodResolver } from '@hookform/resolvers/zod';
import { landingEventsHeroSchema } from '@/lib/schemas/landing-events';
import { updateHeroSection } from '@/lib/actions/landing-events-actions';
import { LandingEventsHero } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/shared/image-upload';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface HeroFormProps {
  initialData: LandingEventsHero;
}

export function HeroForm({ initialData }: HeroFormProps) {
  const { toast } = useToast();
  
  // Local form definition
  const methods = useForm<LandingEventsHero>({
    resolver: zodResolver(landingEventsHeroSchema),
    defaultValues: initialData,
  });

  const { control, setValue, watch, formState: { isDirty, isSubmitting } } = methods;

  const [state, formAction] = useActionState(updateHeroSection, null);

  const backgroundImageUrl = watch('backgroundImageUrl');

  useEffect(() => {
    if (state?.success) {
      toast({ title: "Hero Section guardado", description: state.message });
      methods.reset(methods.getValues()); // Reset dirty state
    } else if (state?.message) {
      toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast, methods]);

  return (
    <Card>
        <CardHeader>
            <CardTitle>1. Hero Section</CardTitle>
        </CardHeader>
        <CardContent>
             <FormProvider {...methods}>
                <form action={formAction} id="hero-form" className="space-y-6">
                    <FormField
                    control={control}
                    name="title" // Note: name is just "title", not "hero.title" anymore
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Titular (H1)</FormLabel>
                        <FormControl>
                            <Input placeholder="Deja de 'organizar carreras'..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={control}
                    name="subtitle"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Subtítulo (H2)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Transformamos el caos operativo..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={control}
                    name="ctaButton"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Texto del Botón Principal</FormLabel>
                        <FormControl>
                            <Input placeholder="Solicitar una Demo Personalizada" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={control}
                    name="trustCopy"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Micro-copy de Confianza</FormLabel>
                        <FormControl>
                            <Input placeholder="Validado en eventos de +5,000 ciclistas..." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    
                    <div className="space-y-4">
                        <FormLabel>Imagen de Fondo</FormLabel>
                        
                        {backgroundImageUrl && (
                            <div className="mb-4">
                            <p className="text-sm text-muted-foreground mb-2">Imagen Actual:</p>
                            <div className="relative w-full h-48 rounded-md overflow-hidden border">
                                <Image 
                                src={backgroundImageUrl} 
                                alt="Fondo actual" 
                                fill 
                                className="object-cover"
                                />
                            </div>
                            </div>
                        )}

                        <ImageUpload
                            storagePath="landing-events/hero"
                            onUploadSuccess={(url) => {
                                setValue('backgroundImageUrl', url, { shouldDirty: true, shouldValidate: true });
                            }}
                            buttonText="Subir Nueva Imagen"
                            guidelinesText="Recomendado: 1920x1080px, alta resolución."
                        />

                        <FormField
                            control={control}
                            name="backgroundImageUrl"
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
                     {/* Hidden inputs to pass data to server action via FormData 
                        Because we are using nested components or controlled inputs that might not write directly to FormData
                        React Hook Form handles validation, but we need to ensure the action receives the data.
                        Ideally, we should use `onSubmit` to gather data and call action, OR ensure all inputs have `name` attributes correctly.
                        Since we simplified names to "title", "subtitle", etc., standard HTML inputs work.
                        BUT for ImageUpload which updates state, the hidden input above handles it.
                     */}
                </form>
             </FormProvider>
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
            <Button 
                type="submit" 
                form="hero-form" 
                disabled={isSubmitting || !isDirty}
            >
                {isSubmitting ? 'Guardando...' : 'Guardar Hero Section'}
            </Button>
        </CardFooter>
    </Card>
  );
}
