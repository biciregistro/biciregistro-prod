'use client';

import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Bike, Trophy, GraduationCap, Mic2, Banknote } from 'lucide-react';
import { z } from "zod";
import { eventFormSchema } from '@/lib/schemas';

type EventFormValues = z.infer<typeof eventFormSchema>;

interface StepProps {
    form: UseFormReturn<EventFormValues>;
}

export function StepOneDefinition({ form }: StepProps) {
    const eventTypes = [
        { id: 'Rodada', icon: Bike, label: 'Rodada', desc: 'Paseo grupal recreativo' },
        { id: 'Competencia', icon: Trophy, label: 'Competencia', desc: 'Carrera con cronometraje' },
        { id: 'Taller', icon: GraduationCap, label: 'Taller', desc: 'Clase o curso práctico' },
        { id: 'Conferencia', icon: Mic2, label: 'Conferencia', desc: 'Charla o presentación' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">1. ¿Qué tipo de evento estás organizando?</h2>
                <FormField
                    control={form.control}
                    name="eventType"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {eventTypes.map((type) => {
                                        const isSelected = field.value === type.id;
                                        return (
                                            <div 
                                                key={type.id}
                                                className={cn(
                                                    "cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-3 transition-all hover:border-primary/50",
                                                    isSelected ? "border-primary bg-primary/5" : "border-muted bg-card"
                                                )}
                                                onClick={() => field.onChange(type.id)}
                                            >
                                                <div className={cn("p-3 rounded-full", isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                                    <type.icon className="h-6 w-6" />
                                                </div>
                                                <div className="text-center">
                                                    <h3 className="font-semibold">{type.label}</h3>
                                                    <p className="text-xs text-muted-foreground">{type.desc}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="space-y-4 pt-4 border-t">
                <h2 className="text-xl font-semibold">2. ¿El evento tiene costo de inscripción?</h2>
                 <FormField
                    control={form.control}
                    name="costType"
                    render={({ field }) => (
                         <FormItem>
                            <FormControl>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div 
                                        className={cn(
                                            "cursor-pointer rounded-xl border-2 p-6 flex items-center gap-4 transition-all hover:border-primary/50",
                                            field.value === 'Gratuito' ? "border-primary bg-primary/5" : "border-muted bg-card"
                                        )}
                                        onClick={() => {
                                            field.onChange('Gratuito');
                                            form.setValue('costTiers', []);
                                            form.setValue('paymentDetails', '');
                                        }}
                                    >
                                        <div className={cn("p-3 rounded-full", field.value === 'Gratuito' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                            <Bike className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">Gratuito</h3>
                                            <p className="text-sm text-muted-foreground">Entrada libre para todos los asistentes.</p>
                                        </div>
                                    </div>

                                    <div 
                                        className={cn(
                                            "cursor-pointer rounded-xl border-2 p-6 flex items-center gap-4 transition-all hover:border-primary/50",
                                            field.value === 'Con Costo' ? "border-primary bg-primary/5" : "border-muted bg-card"
                                        )}
                                        onClick={() => field.onChange('Con Costo')}
                                    >
                                        <div className={cn("p-3 rounded-full", field.value === 'Con Costo' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                            <Banknote className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">Con Costo</h3>
                                            <p className="text-sm text-muted-foreground">Venta de boletos o inscripciones.</p>
                                        </div>
                                    </div>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
}
