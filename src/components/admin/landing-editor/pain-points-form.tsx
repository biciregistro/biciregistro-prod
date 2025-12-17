// src/components/admin/landing-editor/pain-points-form.tsx
'use client';

import React, { useActionState, useEffect } from 'react';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { landingEventsPainPointsSectionSchema } from '@/lib/schemas/landing-events';
import { updatePainPointsSection } from '@/lib/actions/landing-events-actions';
import { LandingEventsContent } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type PainPointsData = LandingEventsContent['painPointsSection'];

interface PainPointsFormProps {
  initialData: PainPointsData;
}

export function PainPointsForm({ initialData }: PainPointsFormProps) {
  const { toast } = useToast();

  const methods = useForm<PainPointsData>({
    resolver: zodResolver(landingEventsPainPointsSectionSchema),
    defaultValues: initialData,
  });

  const { control, formState: { isDirty, isSubmitting } } = methods;
  const { fields } = useFieldArray({
    control,
    name: "points",
  });

  const [state, formAction] = useActionState(updatePainPointsSection, null);

  useEffect(() => {
    if (state?.success) {
      toast({ title: "Sección de Dolor guardada", description: state.message });
      methods.reset(methods.getValues());
    } else if (state?.message) {
      toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast, methods]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Sección del Dolor (Pain Points)</CardTitle>
      </CardHeader>
      <CardContent>
         <FormProvider {...methods}>
            <form action={formAction} id="pain-points-form" className="space-y-6">
                <FormField
                control={control}
                name="title"
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
                     {/* Updated hidden input to use dot notation for consistency with server parser */}
                     <input type="hidden" name={`points.${index}.id`} value={field.id} />
                    
                    <FormField
                        control={control}
                        // Cast to any to avoid tuple index type errors in strict mode
                        name={`points.${index}.title` as any}
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
                        name={`points.${index}.description` as any}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                            <Textarea {...field} value={field.value as string} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    </div>
                ))}
                </div>
            </form>
         </FormProvider>
      </CardContent>
      <CardFooter className="justify-end border-t pt-6">
            <Button 
                type="submit" 
                form="pain-points-form" 
                disabled={isSubmitting || !isDirty}
            >
                {isSubmitting ? 'Guardando...' : 'Guardar Pain Points'}
            </Button>
      </CardFooter>
    </Card>
  );
}
