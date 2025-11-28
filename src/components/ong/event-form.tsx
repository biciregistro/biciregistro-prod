'use client';

import { useTransition, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, usePathname } from 'next/navigation';

import { eventFormSchema } from '@/lib/schemas';
import { saveEvent } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';
import { calculateGrossUp, calculateFeeBreakdown } from '@/lib/utils';
import type { Event, FinancialSettings } from '@/lib/types';

import { GeneralSection } from './event-form-sections/general-section';
import { ConfigurationSection } from './event-form-sections/configuration-section';
import { CostSection } from './event-form-sections/cost-section';

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
    initialData?: Event;
    financialSettings: FinancialSettings;
}

export function EventForm({ initialData, financialSettings }: EventFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();

    // Initial Tiers Logic: Map initial tiers to use NET price if available, else PRICE (Total)
    const initialTiers = initialData?.costTiers?.map(tier => ({
        ...tier,
        price: tier.netPrice || tier.price
    })) || [];

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
            sponsors: initialData?.sponsors || [],
        },
    });

    const onSubmit = async (data: EventFormValues, isDraft: boolean) => {
        startTransition(async () => {
            const isCostEnabled = data.costType === 'Con Costo';

            // Process Cost Tiers: Calculate Gross-up and Fee
            const processedTiers = data.costTiers?.map(tier => {
                if (!isCostEnabled) return tier;
                
                const netPrice = Number(tier.price); // Input is NET
                const totalGrossPrice = calculateGrossUp(netPrice, financialSettings);
                const breakdown = calculateFeeBreakdown(totalGrossPrice, netPrice);

                return {
                    ...tier,
                    price: totalGrossPrice, // Save TOTAL for payment gateway
                    netPrice: netPrice,     // Save NET for organizer
                    fee: breakdown.feeAmount // Save FEE for platform revenue
                };
            }) || [];

            // Merge form data with ID if editing
            const submitData = { 
                ...data, 
                id: initialData?.id,
                costTiers: isCostEnabled ? processedTiers : [],
            };
            
            // Cleanup logic for disabled features
            if (!isCostEnabled) {
                submitData.paymentDetails = undefined;
                submitData.costType = 'Gratuito';
            }

            if (!data.hasCategories) {
                submitData.categories = [];
            }

            if (!data.hasRegistrationDeadline) {
                submitData.registrationDeadline = undefined;
            }

            // Note: requiresEmergency and requiresBike are boolean, so false is valid data
            
            const result = await saveEvent(submitData, isDraft);

            if (result?.success) {
                toast({
                    title: isDraft ? "Borrador Guardado" : "Evento Publicado",
                    description: result.message,
                });
                
                if (pathname.startsWith('/admin')) {
                    router.push('/admin?tab=events');
                } else {
                    router.push('/dashboard/ong');
                }
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result?.error || "Hubo un problema al guardar el evento.",
                });
            }
        });
    };

    const onError = (errors: any) => {
        console.log("Validation Errors:", errors);
        toast({
            variant: "destructive",
            title: "Faltan campos obligatorios",
            description: "Por favor, revisa el formulario y completa los campos marcados en rojo.",
        });
    };

    return (
        <Form {...form}>
            <form className="space-y-8">
                
                <GeneralSection form={form} />
                
                <ConfigurationSection form={form} />

                <CostSection form={form} financialSettings={financialSettings} />

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t mt-8">
                    <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full sm:w-auto"
                        onClick={form.handleSubmit((data) => onSubmit(data, true), onError)}
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Guardar Borrador
                    </Button>
                    <Button 
                        type="button" 
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                        onClick={form.handleSubmit((data) => onSubmit(data, false), onError)}
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Publicar Evento
                    </Button>
                </div>
            </form>
        </Form>
    );
}
