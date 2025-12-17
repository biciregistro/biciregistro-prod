// src/components/admin/landing-editor/cta-form.tsx
'use client';

import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash } from 'lucide-react';

export function CtaForm() {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "socialProofSection.allies",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>5. Prueba Social y Cierre (CTA Final)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Social Proof Section */}
        <div>
            <h3 className="text-lg font-medium mb-2">Logos de Aliados</h3>
            <div className="space-y-4 rounded-md border p-4">
            {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-4">
                    <FormField
                        control={control}
                        name={`socialProofSection.allies.${index}.name`}
                        render={({ field }) => (
                        <FormItem className="flex-1">
                            <FormLabel>Nombre del Aliado</FormLabel>
                            <FormControl>
                            <Input {...field} placeholder="Ej. Federación Ciclista" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`socialProofSection.allies.${index}.logoUrl`}
                        render={({ field }) => (
                        <FormItem className="flex-1">
                            <FormLabel>URL del Logo</FormLabel>
                            <FormControl>
                            <Input {...field} type="url" placeholder="https://.../logo.png" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                        <Trash className="h-4 w-4" />
                    </Button>
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: '', logoUrl: '' })}
            >
                Agregar Aliado
            </Button>
            </div>
        </div>

        {/* CTA Section */}
        <div>
            <h3 className="text-lg font-medium mb-2 mt-6">Sección CTA Final</h3>
            <div className="space-y-4">
            <FormField
                control={control}
                name="ctaSection.title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                        <Input placeholder="¿Listo para profesionalizar tu próximo evento?" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
                control={control}
                name="ctaSection.description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Deja que la tecnología maneje el caos..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
                control={control}
                name="ctaSection.ctaButton"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Texto del Botón</FormLabel>
                    <FormControl>
                        <Input placeholder="Hablar con un Experto" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
