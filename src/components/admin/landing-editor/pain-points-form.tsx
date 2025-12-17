// src/components/admin/landing--editor/pain-points-form.tsx
'use client';

import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function PainPointsForm() {
  const { control } = useFormContext();
  const { fields } = useFieldArray({
    control,
    name: "painPointsSection.points",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Sección del Dolor (Pain Points)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={control}
          name="painPointsSection.title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título de la Sección</FormLabel>
              <FormControl>
                <Input placeholder="¿Te suena familiar este caos?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-4 rounded-md border p-4">
          {fields.map((field, index) => (
            <div key={field.id} className="space-y-2">
               <h4 className="font-semibold">Punto de Dolor #{index + 1}</h4>
              <FormField
                control={control}
                name={`painPointsSection.points.${index}.title`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`painPointsSection.points.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
