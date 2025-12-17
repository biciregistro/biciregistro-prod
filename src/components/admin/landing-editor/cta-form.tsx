// src/components/admin/landing-editor/cta-form.tsx
'use client';

import React, { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { landingEventsCtaSchema } from '@/lib/schemas/landing-events';
import { updateSocialProofSection, updateCtaSection } from '@/lib/actions/landing-events-actions';
import { LandingEventsContent } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SponsorsManager, Sponsor } from '@/components/shared/sponsors-manager';

type SocialProofData = LandingEventsContent['socialProofSection'];
type CtaData = LandingEventsContent['ctaSection'];

interface CtaFormProps {
  socialProofData: SocialProofData;
  ctaData: CtaData;
}

function SubmitButton({ text = "Guardar", className }: { text?: string, className?: string }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className={className} variant="secondary">
            {pending ? 'Guardando...' : text}
        </Button>
    );
}

function SocialProofSubForm({ initialData }: { initialData: SocialProofData }) {
    const { toast } = useToast();
    const [state, formAction] = useActionState(updateSocialProofSection, null);

    useEffect(() => {
        if (state?.success) {
            toast({ title: "Aliados guardados", description: state.message });
        } else if (state?.message) {
            toast({ title: "Error", description: state.message, variant: "destructive" });
        }
    }, [state, toast]);

    // Map LandingEventsAlly (name, logoUrl) to Sponsor (name, url)
    const initialSponsors: Sponsor[] = initialData.allies?.map(a => ({
        name: a.name,
        url: a.logoUrl
    })) || [];

    return (
        <div className="space-y-4 border rounded-md p-4 mb-6">
            <h3 className="text-lg font-medium mb-2">Logos de Aliados</h3>
            <form action={formAction} className="space-y-4">
                <SponsorsManager 
                    initialSponsors={initialSponsors} 
                    namePrefix="allies" 
                />
                <div className="flex justify-end mt-4">
                    <SubmitButton text="Guardar Aliados" />
                </div>
            </form>
        </div>
    );
}

function CtaSubForm({ initialData }: { initialData: CtaData }) {
    const { toast } = useToast();
    const methods = useForm<CtaData>({
        resolver: zodResolver(landingEventsCtaSchema),
        defaultValues: initialData,
    });
    const { control, formState: { isDirty, isSubmitting } } = methods;

    const [state, formAction] = useActionState(updateCtaSection, null);

    useEffect(() => {
        if (state?.success) {
            toast({ title: "CTA Final guardado", description: state.message });
            methods.reset(methods.getValues());
        } else if (state?.message) {
            toast({ title: "Error", description: state.message, variant: "destructive" });
        }
    }, [state, toast, methods]);

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium mb-2 mt-6">Sección CTA Final</h3>
             <FormProvider {...methods}>
                <form action={formAction} id="cta-section-form" className="space-y-4">
                    <FormField
                        control={control}
                        name="title"
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
                        name="description"
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
                        name="ctaButton"
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
                </form>
             </FormProvider>
             <div className="flex justify-end mt-4 pt-4 border-t">
                 <Button type="submit" form="cta-section-form" disabled={isSubmitting || !isDirty}>
                     {isSubmitting ? 'Guardando...' : 'Guardar CTA Final'}
                 </Button>
             </div>
        </div>
    );
}

export function CtaForm({ socialProofData, ctaData }: CtaFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>5. Prueba Social y Cierre</CardTitle>
      </CardHeader>
      <CardContent>
         <SocialProofSubForm initialData={socialProofData} />
         <CtaSubForm initialData={ctaData} />
      </CardContent>
    </Card>
  );
}
