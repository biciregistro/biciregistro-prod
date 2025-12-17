// src/components/admin/landing-editor/feature-form.tsx
'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/shared/image-upload';
import Image from 'next/image';

export function FeatureForm() {
  const { control, setValue, watch } = useFormContext();

  const imageUrl = watch('featureSection.imageUrl');

  return (
    <Card>
      <CardHeader>
        <CardTitle>4. Killer Feature (Visualización de Data)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={control}
          name="featureSection.title"
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
          name="featureSection.description"
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
        
        {/* Image Upload for Feature Image */}
        <div className="space-y-4">
          <FormLabel>Imagen del Dashboard (Mockup)</FormLabel>
          
          {imageUrl && (
            <div className="mb-4">
               <p className="text-sm text-muted-foreground mb-2">Imagen Actual:</p>
               <div className="relative w-full h-64 rounded-md overflow-hidden border">
                 <Image 
                   src={imageUrl} 
                   alt="Feature mockup" 
                   fill 
                   className="object-contain bg-gray-100" // Use contain for mockups to show full UI
                 />
               </div>
            </div>
          )}

          <ImageUpload
             storagePath="landing-events/features"
             onUploadSuccess={(url) => {
               setValue('featureSection.imageUrl', url, { shouldDirty: true, shouldValidate: true });
             }}
             buttonText="Subir Mockup"
             guidelinesText="Recomendado: 1200x800px. Captura de pantalla o diseño de alta fidelidad."
          />

           {/* Hidden input to ensure the field is registered and validated properly */}
           <FormField
            control={control}
            name="featureSection.imageUrl"
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
