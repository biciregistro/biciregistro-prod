'use client';

import { useState, useTransition } from 'react';
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from 'next/navigation';
import { eventFormSchema } from '@/lib/schemas';
import { saveEvent } from '@/lib/actions/ong-actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form } from "@/components/ui/form";
import { Loader2, ChevronRight, ChevronLeft, Save } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import type { Event, FinancialSettings, OngUser } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

import { StepOneDefinition } from './step-one-definition';
import { StepTwoDetails } from './step-two-details';
import { StepThreeConfiguration } from './step-three-configuration';
import { StepFourShare } from './step-four-share';

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventWizardProps {
    initialData?: Event;
    financialSettings: FinancialSettings;
    hasFinancialData: boolean;
    ongProfile?: Partial<OngUser>;
}

const STEPS = [
    { id: 1, title: "Tipo y Costo" },
    { id: 2, title: "Detalles" },
    { id: 3, title: "Configuración" },
    { id: 4, title: "Publicar" },
];

export function EventWizard({ initialData, financialSettings, hasFinancialData, ongProfile }: EventWizardProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [isPending, startTransition] = useTransition();
    const [savedEventId, setSavedEventId] = useState<string | null>(initialData?.id || null);
    const { toast } = useToast();
    const router = useRouter();

    // Initialize form with same logic as original EventForm
     const initialTiers = initialData?.costTiers?.map(tier => {
        const displayPrice = tier.absorbFee ? tier.price : (tier.netPrice || tier.price);
        return {
            ...tier,
            price: displayPrice,
            absorbFee: !!tier.absorbFee
        };
    }) || [];

    const form = useForm<EventFormValues>({
        resolver: zodResolver(eventFormSchema),
        defaultValues: {
            name: initialData?.name || "",
            eventType: initialData?.eventType as any || undefined,
            date: initialData?.date ? new Date(initialData.date).toISOString().slice(0, 16) : "",
            country: initialData?.country || "México",
            state: initialData?.state || "",
            modality: initialData?.modality || "",
            description: initialData?.description || "",
            imageUrl: initialData?.imageUrl || "",
            googleMapsUrl: initialData?.googleMapsUrl || "",
            level: initialData?.level as any || undefined,
            distance: initialData?.distance || 0,
            costType: initialData?.costType as any || "Gratuito",
            paymentDetails: initialData?.paymentDetails || "",
            costTiers: initialTiers,
            maxParticipants: initialData?.maxParticipants || 0,
            hasCategories: initialData?.hasCategories || false,
            categories: initialData?.categories || [],
            hasRegistrationDeadline: initialData?.hasRegistrationDeadline || false,
            registrationDeadline: initialData?.registrationDeadline ? new Date(initialData.registrationDeadline).toISOString().slice(0, 16) : "",
            requiresEmergencyContact: initialData?.requiresEmergencyContact || false,
            requiresBike: initialData?.requiresBike !== false,
            requiresWaiver: initialData?.requiresWaiver || false,
            waiverText: initialData?.waiverText || "",
            bibNumberConfig: initialData?.bibNumberConfig ? {
                enabled: initialData.bibNumberConfig.enabled,
                mode: initialData.bibNumberConfig.mode,
                nextNumber: initialData.bibNumberConfig.nextNumber
            } : {
                enabled: false,
                mode: 'automatic',
                nextNumber: 1
            },
            hasJersey: initialData?.hasJersey || false,
            jerseyConfigs: initialData?.jerseyConfigs || [],
            hasCustomQuestions: initialData?.hasCustomQuestions || (initialData?.customQuestions && initialData.customQuestions.length > 0) || false,
            customQuestions: initialData?.customQuestions || [],
            sponsors: initialData?.sponsors || [],
        },
        mode: "onChange", 
    });

    const processSubmit = async (data: EventFormValues, isDraft: boolean) => {
          const isCostEnabled = data.costType === 'Con Costo';
            
            // We send the data "as is" (raw input). 
            // The Server Action handles the financial calculations (GrossUp vs Absorbed).
            const submitData = { 
                ...data, 
                id: savedEventId || initialData?.id,
                costTiers: isCostEnabled ? data.costTiers : [],
            };
            
            if (!isCostEnabled) {
                submitData.paymentDetails = undefined;
                submitData.costType = 'Gratuito';
            }
             // Cleanup logic
            if (!data.hasCategories) submitData.categories = [];
            if (!data.hasRegistrationDeadline) submitData.registrationDeadline = undefined;
            if (!data.requiresWaiver) submitData.waiverText = undefined;
            if (!data.hasCustomQuestions) submitData.customQuestions = [];
            
            const result = await saveEvent(submitData, isDraft);
            return result;
    };


    const handleNext = async () => {
        let fieldsToValidate: any[] = [];
        
        if (currentStep === 1) {
            fieldsToValidate = ['eventType', 'costType'];
        } else if (currentStep === 2) {
             fieldsToValidate = ['name', 'date', 'country', 'state', 'modality', 'description', 'imageUrl', 'googleMapsUrl', 'level', 'distance', 'maxParticipants'];
        } else if (currentStep === 3) {
             fieldsToValidate = []; // Trigger full form validation
        }

        let isValid = false;
        if (fieldsToValidate.length > 0) {
             isValid = await form.trigger(fieldsToValidate);
        } else {
             isValid = await form.trigger();
        }

        if (isValid) {
            if (currentStep === 3) {
               // PUBLISH ACTION
               startTransition(async () => {
                   const result = await processSubmit(form.getValues(), false);
                   if (result?.success) {
                       setSavedEventId(result.eventId || null);
                       setCurrentStep(4);
                       toast({ title: "¡Evento Publicado!", description: "Tu evento ya es visible para todos." });
                       window.scrollTo(0, 0);
                   } else {
                       toast({ variant: "destructive", title: "Error", description: result?.error || "Error al publicar." });
                   }
               });

            } else {
                setCurrentStep(prev => prev + 1);
                window.scrollTo(0, 0);
            }
        } else {
             toast({
                variant: "destructive",
                title: "Faltan datos",
                description: "Por favor completa los campos obligatorios antes de continuar."
            });
        }
    };

    const handleDraft = async () => {
         startTransition(async () => {
             const result = await processSubmit(form.getValues(), true);
             if (result?.success) {
                 toast({ title: "Borrador guardado", description: "Puedes continuar editando más tarde." });
                 router.push('/dashboard/ong');
             } else {
                  toast({ variant: "destructive", title: "Error", description: result?.error || "Error al guardar borrador." });
             }
         });
    };

    const handleBack = () => {
        setCurrentStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const progress = (currentStep / STEPS.length) * 100;

    return (
        <div className="space-y-6">
            {/* Stepper Header */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium text-muted-foreground mb-2">
                     <span>Paso {currentStep} de 4: {STEPS[currentStep-1].title}</span>
                     <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            <Form {...form}>
                <form className="space-y-8">
                    <Card className="border-0 shadow-none sm:border sm:shadow-sm">
                        <CardContent className="p-4 sm:p-6 pt-6">
                            
                            {currentStep === 1 && (
                                <StepOneDefinition form={form} />
                            )}
                            
                            {currentStep === 2 && (
                                <StepTwoDetails form={form} />
                            )}
                            
                            {currentStep === 3 && (
                                <StepThreeConfiguration 
                                    form={form} 
                                    financialSettings={financialSettings}
                                    hasFinancialData={hasFinancialData}
                                    ongProfile={ongProfile}
                                    isPublished={initialData?.status === 'published'}
                                />
                            )}
                            
                            {currentStep === 4 && (
                                <StepFourShare 
                                    eventId={savedEventId!} 
                                    eventData={form.getValues()} 
                                    organizerName={ongProfile?.organizationName || 'nuestra organización'}
                                />
                            )}

                        </CardContent>
                    </Card>

                    {/* Navigation Buttons */}
                    {currentStep < 4 && (
                         <div className="flex flex-col-reverse sm:flex-row justify-between gap-4">
                            {currentStep > 1 ? (
                                <Button type="button" variant="outline" onClick={handleBack} disabled={isPending}>
                                    <ChevronLeft className="mr-2 h-4 w-4" /> Atrás
                                </Button>
                            ) : (
                                <div /> /* Spacer */
                            )}

                            <div className="flex flex-col sm:flex-row gap-3">
                                {currentStep === 3 && (
                                    <Button 
                                        type="button" 
                                        variant="secondary" 
                                        onClick={handleDraft}
                                        disabled={isPending}
                                    >
                                        <Save className="mr-2 h-4 w-4" /> Guardar Borrador
                                    </Button>
                                )}
                                
                                <Button 
                                    type="button" 
                                    onClick={handleNext}
                                    disabled={isPending}
                                    className={currentStep === 3 ? "bg-green-600 hover:bg-green-700" : ""}
                                >
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {currentStep === 3 ? "Publicar Evento" : "Siguiente"}
                                    {currentStep !== 3 && <ChevronRight className="ml-2 h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    )}
                </form>
            </Form>
        </div>
    );
}
