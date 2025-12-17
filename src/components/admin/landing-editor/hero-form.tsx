// src/components/admin/landing-editor/hero-form.tsx
'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/shared/image-upload'; // Import ImageUpload
import Image from 'next/image';

export function HeroForm() {
  const { control, setValue, watch } = useFormContext(); // Add setValue and watch

  // Watch the image URL to display a preview
  const backgroundImageUrl = watch('hero.backgroundImageUrl');

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Hero Section</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={control}
          name="hero.title"
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
          name="hero.subtitle"
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
          name="hero.ctaButton"
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
          name="hero.trustCopy"
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
        
        {/* Image Upload for Background Image */}
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
               setValue('hero.backgroundImageUrl', url, { shouldDirty: true, shouldValidate: true });
             }}
             buttonText="Subir Nueva Imagen"
             guidelinesText="Recomendado: 1920x1080px, alta resolución."
          />

           {/* Hidden input to ensure the field is registered and validated properly */}
           <FormField
            control={control}
            name="hero.backgroundImageUrl"
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

      </CardContent>
    </Card>
  );
}
