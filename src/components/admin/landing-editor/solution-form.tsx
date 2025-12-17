// src/components/admin/landing-editor/solution-form.tsx
'use client';

import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function SolutionForm() {
  const { control } = useFormContext();
  const { fields } = useFieldArray({
    control,
    name: "solutionSection.solutions",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>3. La Solución (Ejes Estratégicos)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={control}
          name="solutionSection.title"
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
            <div key={field.id} className="space-y-2">
              <h4 className="font-semibold">Eje #{index + 1}</h4>
              <FormField
                control={control}
                name={`solutionSection.solutions.${index}.title`}
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
                name={`solutionSection.solutions.${index}.description`}
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
