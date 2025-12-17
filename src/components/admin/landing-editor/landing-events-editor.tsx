// src/components/admin/landing-editor/landing-events-editor.tsx
'use client';

import React, { useActionState } from 'react'; // Updated import
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { landingEventsContentSchema } from '@/lib/schemas';
import { LandingEventsContent } from '@/lib/types';
import { updateLandingEventsContent } from '@/lib/actions/landing-events-actions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Usar rutas absolutas para evitar problemas de resolución relativa
import { HeroForm } from '@/components/admin/landing-editor/hero-form';
import { PainPointsForm } from '@/components/admin/landing-editor/pain-points-form';
import { SolutionForm } from '@/components/admin/landing-editor/solution-form';
import { FeatureForm } from '@/components/admin/landing-editor/feature-form';
import { CtaForm } from '@/components/admin/landing-editor/cta-form';

interface LandingEventsEditorProps {
  content: LandingEventsContent;
}

export function LandingEventsEditor({ content }: LandingEventsEditorProps) {
  const { toast } = useToast();

  const methods = useForm<LandingEventsContent>({
    resolver: zodResolver(landingEventsContentSchema),
    defaultValues: content,
  });

  // Updated hook usage
  const [formState, formAction] = useActionState(updateLandingEventsContent, null);

  React.useEffect(() => {
    if (formState?.success) {
      toast({
        title: "Éxito",
        description: formState.message,
      });
    } else if (formState?.message && !formState.success) {
       toast({
        title: "Error",
        description: formState.message,
        variant: "destructive",
      });
    }
  }, [formState, toast]);

  return (
    <FormProvider {...methods}>
      <form action={formAction} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Editor de Contenido - Landing "Events Manager"</CardTitle>
            <CardDescription>
              Modifica los textos e imágenes de la página pública de Events Manager.
              Los cambios se guardarán para todo el documento.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Each section will be its own component */}
        <HeroForm />
        <PainPointsForm />
        <SolutionForm />
        <FeatureForm />
        <CtaForm />
        
        <Card>
          <CardContent className="pt-6">
             <Button type="submit" disabled={methods.formState.isSubmitting}>
              Guardar Cambios
            </Button>
            {methods.formState.isDirty && <p className="text-sm text-yellow-600 mt-2">Tienes cambios sin guardar.</p>}
          </CardContent>
        </Card>

      </form>
    </FormProvider>
  );
}
