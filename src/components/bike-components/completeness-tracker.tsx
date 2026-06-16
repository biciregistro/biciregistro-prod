import React from 'react';
import { CheckCircle2, Circle, ShieldCheck, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Bike, ComponentDetail } from '@/lib/types';

export interface CompletenessMetrics {
    percentage: number;
    isVerified: boolean;
    isComplete: boolean; // Preservada por compatibilidad hacia atrás en selectores de UI
    milestones: {
        base: boolean;
        components: boolean;
        invoice: boolean;
    };
}

// Algoritmo centralizado y determinista
export function getBikeCompleteness(bike: Bike): CompletenessMetrics {
    let totalFields = 17; // 7 base + 9 components + 1 invoice
    let filledFields = 0;

    // --- HITO 1: BASE INFO ---
    let baseFields = 7;
    let filledBase = 0;
    if (bike.make) filledBase++;
    if (bike.model) filledBase++;
    if (bike.modelYear) filledBase++;
    if (bike.color) filledBase++;
    if (bike.modality) filledBase++;
    if (bike.serialNumber && !bike.serialNumber.startsWith('PENDING_')) filledBase++;
    if (bike.photos && bike.photos.length > 0) filledBase++;
    
    filledFields += filledBase;

    // --- HITO 2: COMPONENTES ---
    let componentsFields = 9;
    let filledComponents = 0;
    if (bike.frameMaterial) filledComponents++;

    const checkComponent = (comp?: ComponentDetail) => {
        if (!comp) return false;
        return !!(comp.isNotApplicable || comp.isGeneric || (comp.brand && comp.model) || (comp.brand && comp.model === "Standard"));
    };

    if (checkComponent(bike.components?.brakes)) filledComponents++;
    if (checkComponent(bike.components?.fork)) filledComponents++;
    if (checkComponent(bike.components?.shock)) filledComponents++;
    if (checkComponent(bike.components?.drivetrain)) filledComponents++;
    if (checkComponent(bike.components?.tires)) filledComponents++;
    if (checkComponent(bike.components?.saddle)) filledComponents++;
    if (checkComponent(bike.components?.grips)) filledComponents++;
    if (checkComponent(bike.components?.pedals)) filledComponents++;

    if (bike.modality && bike.modality.toLowerCase().includes('e-bike')) {
        componentsFields = 10;
        totalFields = 18;
        if (checkComponent(bike.components?.motor)) filledComponents++;
    }

    filledFields += filledComponents;

    // --- HITO 3: FACTURA (INVOICE) ---
    let filledInvoice = 0;
    if (bike.ownershipProof) {
        filledInvoice++;
        filledFields++;
    }

    const isVerified = filledFields === totalFields;

    return {
        percentage: Math.round((filledFields / totalFields) * 100),
        isVerified,
        isComplete: isVerified, // El alias "isComplete" ahora equivale a "isVerified" para consistencia
        milestones: {
            base: filledBase === baseFields,
            components: filledComponents === componentsFields,
            invoice: filledInvoice === 1
        }
    };
}

interface CompletenessTrackerProps {
    metrics: CompletenessMetrics;
    className?: string;
}

export function CompletenessTracker({ metrics, className }: CompletenessTrackerProps) {
    const MilestoneItem = ({ label, isCompleted }: { label: string; isCompleted: boolean }) => (
        <div className={cn(
            "flex flex-col items-center gap-1.5 transition-all duration-500",
            isCompleted ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground opacity-60"
        )}>
            {isCompleted ? (
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-1.5 rounded-full">
                    <CheckCircle2 className="w-4 h-4" />
                </div>
            ) : (
                <div className="bg-muted p-1.5 rounded-full">
                    <Circle className="w-4 h-4" />
                </div>
            )}
            <span className="text-[10px] font-bold text-center uppercase tracking-wider">{label}</span>
        </div>
    );

    return (
        <div className={cn("space-y-4 bg-muted/10 p-4 rounded-xl border border-border/50", className)}>
            <div className="flex justify-between items-center px-2">
                <MilestoneItem label="Perfil Básico" isCompleted={metrics.milestones.base} />
                {/* Connector line */}
                <div className={cn("flex-1 h-[2px] mx-2 rounded-full transition-colors duration-500", metrics.milestones.base && metrics.milestones.components ? "bg-emerald-200 dark:bg-emerald-900" : "bg-border")} />
                
                <MilestoneItem label="Componentes" isCompleted={metrics.milestones.components} />
                {/* Connector line */}
                <div className={cn("flex-1 h-[2px] mx-2 rounded-full transition-colors duration-500", metrics.milestones.components && metrics.milestones.invoice ? "bg-emerald-200 dark:bg-emerald-900" : "bg-border")} />
                
                <MilestoneItem label="Factura" isCompleted={metrics.milestones.invoice} />
            </div>

            <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs px-1">
                    <span className="font-semibold text-muted-foreground flex items-center gap-1">
                        {metrics.isVerified ? (
                            <><ShieldCheck className="w-3 h-3 text-emerald-600" /> <span className="text-emerald-700 font-bold">Bicicleta Verificada</span></>
                        ) : (
                            <><Target className="w-3 h-3" /> Identidad Digital</>
                        )}
                    </span>
                    <span className={cn("font-black", metrics.isVerified ? "text-emerald-600" : "text-primary")}>
                        {metrics.percentage}%
                    </span>
                </div>
                <Progress 
                    value={metrics.percentage} 
                    className={cn("h-2", metrics.isVerified && "bg-emerald-100 [&>div]:bg-emerald-600")} 
                />
            </div>
        </div>
    );
}