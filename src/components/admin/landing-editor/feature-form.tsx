// src/components/admin/landing-editor/feature-form.tsx
'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function FeatureForm() {
  const { control } = useFormContext();

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
        <FormField
          control={control}
          name="featureSection.imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de Imagen (Mockup del Dashboard)</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://placehold.co/..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
