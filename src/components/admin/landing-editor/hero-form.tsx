// src/components/admin/landing-editor/hero-form.tsx
'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function HeroForm() {
  const { control } = useFormContext();

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
        <FormField
          control={control}
          name="hero.backgroundImageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de Imagen de Fondo</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://images.unsplash.com/..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
