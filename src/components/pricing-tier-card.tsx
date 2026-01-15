"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tag, ShieldCheck, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CostTier } from '@/lib/types';

export function PricingTierCard({ tier }: { tier: CostTier }) {
    // Calcular comisión si existe netPrice, sino 0
    const fee = tier.fee || (tier.netPrice ? tier.price - tier.netPrice : 0);
    // Asumimos que si no está definido absorbFee, es false (ciclista paga)
    const isFeeAbsorbed = tier.absorbFee === true; 
    const hasFee = fee > 0 && !isFeeAbsorbed;
    
    // Precio base del evento (lo que recibe la organización)
    const eventPrice = tier.netPrice || tier.price; 

    return (
        <Card className="border-primary/20 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-primary">{tier.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <div className="mb-4">
                    <span className="text-3xl font-bold">${tier.price.toFixed(2)}</span>
                    <span className="text-muted-foreground text-sm font-medium"> MXN</span>
                    
                    {/* Desglose de precio si aplica */}
                    {hasFee ? (
                        <div className="mt-1 text-xs font-medium flex flex-wrap gap-1 items-baseline">
                            <span className="text-blue-600 dark:text-blue-400">
                                ${eventPrice.toFixed(2)} inscripción
                            </span>
                            <span className="text-[10px] text-muted-foreground opacity-70">+</span>
                            <span className="text-muted-foreground">
                                ${fee.toFixed(2)} gestión digital
                            </span>
                        </div>
                    ) : (
                        <span className="block text-xs text-muted-foreground font-normal mt-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 w-fit px-2 py-0.5 rounded-full">
                            Precio Neto
                        </span>
                    )}
                </div>
                
                <div className="space-y-3 flex-1">
                    {/* Beneficios Originales */}
                    <div className="flex gap-2 items-start text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                        <Tag className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{tier.includes}</span>
                    </div>

                    {/* Protección Digital Info (Keep name as requested in this section) */}
                    {hasFee && (
                        <div className="flex gap-2 items-start text-sm text-muted-foreground bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-md border border-blue-100 dark:border-blue-900/20">
                            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                            <div className="flex-1">
                                <div className="flex items-center gap-1 flex-wrap">
                                    <span className="font-medium text-blue-900 dark:text-blue-100">Protección Digital Incluida</span>
                                    <TooltipProvider>
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <Info className="h-3.5 w-3.5 text-blue-500 cursor-pointer hover:text-blue-700 transition-colors" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-[280px] p-3 text-xs bg-slate-900 text-white border-slate-800">
                                                <p>
                                                    Este monto cubre la gestión de inscripción y garantiza la validación de seguridad de tu registro digital.
                                                    <br/><br/>
                                                    <span className="text-yellow-400 font-medium">Este monto no es reembolsable.</span>
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
