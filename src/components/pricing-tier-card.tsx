"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tag, ShieldCheck, Info, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CostTier } from '@/lib/types';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

export function PricingTierCard({ tier }: { tier: CostTier }) {
    // Calcular comisión si existe netPrice, sino 0
    const fee = tier.fee || (tier.netPrice ? tier.price - tier.netPrice : 0);
    // Asumimos que si no está definido absorbFee, es false (ciclista paga)
    const isFeeAbsorbed = tier.absorbFee === true; 
    const hasFee = fee > 0 && !isFeeAbsorbed;
    
    // Precio base del evento (lo que recibe la organización)
    const eventPrice = tier.netPrice || tier.price; 
    
    // Lógica Agotado
    const soldCount = tier.soldCount || 0;
    const limit = tier.limit || 0;
    const isSoldOut = limit > 0 && soldCount >= limit;
    const isLowStock = !isSoldOut && limit > 0 && (limit - soldCount) <= 5; // Avisar si quedan 5 o menos

    return (
        <Card className={cn(
            "border-primary/20 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col relative overflow-hidden",
            isSoldOut && "opacity-75 border-gray-200 bg-gray-50/50"
        )}>
             {isSoldOut && (
                <div className="absolute top-0 right-0 left-0 bg-gray-500 text-white text-xs font-bold text-center py-1 z-10">
                    AGOTADO
                </div>
            )}
            {!isSoldOut && isLowStock && (
                 <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-md z-10 flex items-center gap-1">
                    ¡Quedan pocos!
                </div>
            )}

            <CardHeader className={cn("pb-2", isSoldOut && "pt-6")}>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className={cn("text-lg font-bold text-primary", isSoldOut && "text-gray-500 line-through decoration-2")}>
                        {tier.name}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <div className="mb-4">
                    <span className={cn("text-3xl font-bold", isSoldOut && "text-gray-400")}>
                        ${tier.price.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground text-sm font-medium"> MXN</span>
                    
                    {/* Desglose de precio si aplica */}
                    {hasFee && !isSoldOut ? (
                        <div className="mt-1 text-xs font-medium flex flex-wrap gap-1 items-baseline">
                            <span className="text-blue-600 dark:text-blue-400">
                                ${eventPrice.toFixed(2)} inscripción
                            </span>
                            <span className="text-[10px] text-muted-foreground opacity-70">+</span>
                            <span className="text-muted-foreground">
                                ${fee.toFixed(2)} gestión digital
                            </span>
                        </div>
                    ) : !isSoldOut ? (
                        <span className="block text-xs text-muted-foreground font-normal mt-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 w-fit px-2 py-0.5 rounded-full">
                            Precio Neto
                        </span>
                    ) : null}
                </div>
                
                <div className="space-y-3 flex-1">
                    {/* Beneficios Originales */}
                    <div className="flex gap-2 items-start text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                        <Tag className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{tier.includes}</span>
                    </div>

                    {/* Protección Digital Info (Keep name as requested in this section) */}
                    {hasFee && !isSoldOut && (
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
