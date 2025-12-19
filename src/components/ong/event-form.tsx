'use client';

import { useTransition, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, usePathname } from 'next/navigation';

import { eventFormSchema } from '@/lib/schemas';
import { saveEvent } from '@/lib/actions/ong-actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';
import { calculateGrossUp, calculateFeeBreakdown } from '@/lib/utils';
import type { Event, FinancialSettings, OngUser } from '@/lib/types';

import { GeneralSection } from './event-form-sections/general-section';
import { ConfigurationSection } from './event-form-sections/configuration-section';
import { CostSection } from './event-form-sections/cost-section';
import { LegalSection } from './event-form-sections/legal-section';

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
    initialData?: Event;
    financialSettings: FinancialSettings;
    hasFinancialData: boolean;
    ongProfile?: Partial<OngUser>;
}

export function EventForm({ initialData, financialSettings, hasFinancialData, ongProfile }: EventFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();

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
            requiresWaiver: initialData?.requiresWaiver || false,
            waiverText: initialData?.waiverText || "",
            sponsors: initialData?.sponsors || [],
        },
    });

    const onSubmit = async (data: EventFormValues, isDraft: boolean) => {
        startTransition(async () => {
            const isCostEnabled = data.costType === 'Con Costo';
            const isNewEvent = !initialData?.id;

            const processedTiers = data.costTiers?.map(tier => {
                if (!isCostEnabled) return tier;
                
                const netPrice = Number(tier.price);
                const totalGrossPrice = calculateGrossUp(netPrice, financialSettings);
                const breakdown = calculateFeeBreakdown(totalGrossPrice, netPrice);

                return {
                    ...tier,
                    price: totalGrossPrice,
                    netPrice: netPrice,
                    fee: breakdown.feeAmount
                };
            }) || [];

            const submitData = { 
                ...data, 
                id: initialData?.id,
                costTiers: isCostEnabled ? processedTiers : [],
            };
            
            if (!isCostEnabled) {
                submitData.paymentDetails = undefined;
                submitData.costType = 'Gratuito';
            }
            if (!data.hasCategories) submitData.categories = [];
            if (!data.hasRegistrationDeadline) submitData.registrationDeadline = undefined;
            if (!data.requiresWaiver) submitData.waiverText = undefined;
            
            const result = await saveEvent(submitData, isDraft);

            if (result?.success) {
                toast({
                    title: isDraft ? "Borrador Guardado" : "Evento Publicado",
                    description: result.message,
                });
                
                if (!isDraft && isNewEvent && result.eventId) {
                    const redirectUrl = pathname.startsWith('/admin')
                        ? `/admin/events/${result.eventId}`
                        : `/dashboard/ong/events/${result.eventId}`;
                    router.push(redirectUrl);
                } else if (!isDraft && !isNewEvent) {
                    // If editing, just go back to the event management page
                    const redirectUrl = pathname.startsWith('/admin')
                        ? `/admin/events/${result.eventId}`
                        : `/dashboard/ong/events/${result.eventId}`;
                    router.push(redirectUrl);
                }
                else {
                    router.push(pathname.startsWith('/admin') ? '/admin?tab=events' : '/dashboard/ong');
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
                <LegalSection form={form} />
                <CostSection 
                    form={form} 
                    financialSettings={financialSettings} 
                    hasFinancialData={hasFinancialData} 
                    ongProfile={ongProfile}
                />

                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t mt-8">
                    <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full sm:w-auto"
                        onClick={form.handleSubmit((data) => onSubmit(data, true), onError)}
                        disabled={isPending}
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Borrador
                    </Button>
                    <Button 
                        type="button" 
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                        onClick={form.handleSubmit((data) => onSubmit(data, false), onError)}
                        disabled={isPending}
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {initialData?.id ? "Actualizar Evento" : "Publicar Evento"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
