'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Bike, ComponentDetail } from '@/lib/types';
import { FRAME_MATERIAL_OPTIONS, COMPONENT_CATALOG, ComponentCategoryKey, CatalogCategoryDetails } from '@/lib/constants/bike-components';
import { updateBikeComponents } from '@/lib/actions/component-actions';
import { useGamificationToast } from '@/hooks/use-gamification-toast';
import { useToast } from '@/hooks/use-toast';
import { getBikeCompleteness } from '@/components/bike-card';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings2, Target, Loader2, CheckCircle2, ChevronRight, ChevronLeft, Search, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface BikeComponentsWizardProps {
    bike: Bike;
}

type WizardStep = 'garage' | 'brand' | 'model' | 'frameMaterial';

export function BikeComponentsWizard({ bike }: BikeComponentsWizardProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { showRewardToast } = useGamificationToast();
    const [isPending, startTransition] = useTransition();

    // Local State
    const [step, setStep] = useState<WizardStep>('garage');
    const [activeCategory, setActiveCategory] = useState<ComponentCategoryKey | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Data State
    const [frameMaterial, setFrameMaterial] = useState<Bike['frameMaterial']>(bike.frameMaterial);
    const [components, setComponents] = useState<NonNullable<Bike['components']>>(bike.components || {});

    // Derived state - CORREGIDO: Calcula el progreso local de componentes (ADN) en lugar del global
    const { percentage, isComplete } = useMemo(() => {
        let totalFields = 9; // Material Cuadro + 8 Componentes
        let filledFields = 0;

        if (frameMaterial) filledFields++;

        const checkComponent = (comp?: ComponentDetail) => {
            if (!comp) return false;
            return !!(comp.isNotApplicable || comp.isGeneric || (comp.brand && comp.model) || (comp.brand && comp.model === "Standard"));
        };

        if (checkComponent(components.brakes)) filledFields++;
        if (checkComponent(components.fork)) filledFields++;
        if (checkComponent(components.shock)) filledFields++;
        if (checkComponent(components.drivetrain)) filledFields++;
        if (checkComponent(components.tires)) filledFields++;
        if (checkComponent(components.saddle)) filledFields++;
        if (checkComponent(components.grips)) filledFields++;
        if (checkComponent(components.pedals)) filledFields++;

        if (bike.modality && bike.modality.toLowerCase().includes('e-bike')) {
            totalFields = 10;
            if (checkComponent(components.motor)) filledFields++;
        }

        const percentage = Math.round((filledFields / totalFields) * 100);
        return {
            percentage,
            isComplete: filledFields === totalFields
        };
    }, [bike.modality, components, frameMaterial]);

    // Check if local state is different from saved DB state (Dirty State)
    const isDirty = useMemo(() => {
        const materialChanged = frameMaterial !== bike.frameMaterial;
        
        // Deep compare components keys
        const cleanOriginal = bike.components || {};
        const allKeys = new Set([
            ...Object.keys(cleanOriginal),
            ...Object.keys(components)
        ]) as Set<ComponentCategoryKey>;

        for (const key of allKeys) {
            const orig = cleanOriginal[key];
            const curr = components[key];
            if (!orig && !curr) continue;
            if (!orig || !curr) return true;
            if (
                orig.brand !== curr.brand ||
                orig.model !== curr.model ||
                orig.isNotApplicable !== curr.isNotApplicable ||
                orig.isGeneric !== curr.isGeneric
            ) {
                return true;
            }
        }

        return materialChanged;
    }, [bike, components, frameMaterial]);

    const handleSaveData = () => {
        startTransition(async () => {
            const result = await updateBikeComponents(bike.id, frameMaterial || null, components);
            
            if (result.success) {
                if (result.pointsAwarded && result.pointsAwarded > 0) {
                    showRewardToast(result.pointsAwarded, "¡Componentes guardados! Has sumado B-Coins a tu Wallet.");
                } else {
                    toast({ title: "Datos Actualizados", description: "Los componentes han sido guardados exitosamente." });
                }
                router.refresh();
            } else {
                toast({ title: "Error", description: result.message || "No se pudo guardar.", variant: "destructive" });
            }
        });
    };

    const handleComponentUpdate = (category: ComponentCategoryKey, updates: Partial<ComponentDetail>) => {
        setComponents(prev => ({
            ...prev,
            [category]: { ...(prev[category] || {}), ...updates }
        }));
    };

    const handleSelectCategory = (cat: ComponentCategoryKey) => {
        setActiveCategory(cat);
        setStep('brand');
        setSearchQuery('');
    };

    const handleSelectBrand = (brand: string, isGeneric = false, isNotApplicable = false) => {
        if (!activeCategory) return;

        if (isNotApplicable) {
            handleComponentUpdate(activeCategory, { isNotApplicable: true, isGeneric: false, brand: undefined, model: undefined });
            setStep('garage');
            return;
        }

        if (isGeneric) {
            handleComponentUpdate(activeCategory, { isGeneric: true, isNotApplicable: false, brand: undefined, model: undefined });
            setStep('garage');
            return;
        }

        const catData = COMPONENT_CATALOG[activeCategory];
        const isSoloFabricante = catData.brands[brand]?.isSoloFabricante;

        handleComponentUpdate(activeCategory, { 
            brand, 
            model: isSoloFabricante ? "Standard" : undefined,
            isGeneric: false,
            isNotApplicable: false
        });

        if (isSoloFabricante) {
            setStep('garage');
        } else {
            setStep('model');
        }
    };

    const handleSelectModel = (model: string) => {
        if (!activeCategory) return;
        handleComponentUpdate(activeCategory, { model, isGeneric: false });
        setStep('garage');
    };

    const getComponentStatus = (category: ComponentCategoryKey) => {
        const comp = components[category];
        if (!comp) return { label: "Sin registrar", isComplete: false };
        if (comp.isNotApplicable) return { label: "No Aplica", isComplete: true };
        if (comp.isGeneric && comp.model) return { label: `${comp.brand || ''} ${comp.model}`, isComplete: true };
        if (comp.isGeneric) return { label: "Marca Genérica / Desconocida", isComplete: true };
        if (comp.brand && comp.model) return { label: `${comp.brand} ${comp.model === 'Standard' ? '' : comp.model}`, isComplete: true };
        if (comp.brand) return { label: `${comp.brand} (Pendiente Modelo)`, isComplete: false };
        return { label: "Sin registrar", isComplete: false };
    };

    const isEBike = bike.modality?.toLowerCase().includes('e-bike');

    // --- RENDERERS ---

    const renderGarage = () => (
        <div className="space-y-6 animate-in fade-in duration-300 pb-24">
            {/* Cabecera Zeigarnik */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md">
                <div className="flex items-center gap-6">
                    <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center bg-slate-800 rounded-full border-4 border-primary transition-all duration-1000">
                        <span className="font-bold text-xl">{percentage}%</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Progreso de armado</h2>
                        <p className={cn("font-medium", isComplete ? "text-green-400" : "text-primary/90")}>
                            {isComplete ? "¡Perfil al máximo!" : "Te faltan componentes"}
                        </p>
                        {!isComplete && <p className="text-xs text-slate-300 mt-1">Gana B-Coins al llegar al 100%</p>}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-lg text-foreground px-1">Sistemas Base</h3>
                
                {/* Cuadro (Convertido a Card de Flujo Progresivo - HU 1) */}
                <div 
                    onClick={() => setStep('frameMaterial')}
                    className={cn(
                        "p-4 rounded-xl flex justify-between items-center cursor-pointer transition-all border shadow-sm group",
                        frameMaterial ? "bg-green-50/50 border-green-200 dark:bg-green-950/10 dark:border-green-900" : "bg-card border-border hover:border-primary/50"
                    )}
                >
                    <div>
                        <p className="font-bold text-foreground">Cuadro</p>
                        <p className={cn("text-sm", frameMaterial ? "text-green-700 dark:text-green-400 font-medium" : "text-muted-foreground")}>
                            {frameMaterial ? `Material: ${frameMaterial}` : "Sin registrar"}
                        </p>
                    </div>
                    {frameMaterial ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    ) : (
                        <Button variant="secondary" size="sm" className="shrink-0 pointer-events-none group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            + Agregar
                        </Button>
                    )}
                </div>

                {/* Lista Dinámica de Componentes */}
                {(Object.keys(COMPONENT_CATALOG) as ComponentCategoryKey[]).map(key => {
                    if (key === 'motor' && !isEBike) return null;
                    const catData = COMPONENT_CATALOG[key];
                    const status = getComponentStatus(key);

                    return (
                        <div 
                            key={key} 
                            onClick={() => handleSelectCategory(key)}
                            className={cn(
                                "p-4 rounded-xl flex justify-between items-center cursor-pointer transition-all border shadow-sm group",
                                status.isComplete ? "bg-green-50/50 border-green-200 dark:bg-green-950/10 dark:border-green-900" : "bg-card border-border hover:border-primary/50"
                            )}
                        >
                            <div>
                                <p className="font-bold text-foreground">{catData.label}</p>
                                <p className={cn("text-sm", status.isComplete ? "text-green-700 dark:text-green-400 font-medium" : "text-muted-foreground")}>
                                    {status.label}
                                </p>
                            </div>
                            {status.isComplete ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                            ) : (
                                <Button variant="secondary" size="sm" className="shrink-0 pointer-events-none group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    + Agregar
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* BOTÓN GUARDAR FLOTANTE ADAPTATIVO (HCI / UX Optimization) */}
            {isDirty && (
                <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-background/95 backdrop-blur-md p-3 rounded-2xl border border-primary/20 shadow-xl shadow-primary/5 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-8 duration-500 z-40">
                    <div className="pl-2">
                        <p className="text-xs text-muted-foreground font-semibold">Cambios sin guardar</p>
                        <p className="text-sm font-black text-foreground">Completo: {percentage}%</p>
                    </div>
                    <Button 
                        onClick={handleSaveData} 
                        disabled={isPending} 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 px-5 rounded-xl gap-2 shadow-lg shadow-primary/20 shrink-0"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isPending ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            )}
        </div>
    );

    const renderBrandSelector = () => {
        if (!activeCategory) return null;
        const catData = COMPONENT_CATALOG[activeCategory];
        const brands = Object.keys(catData.brands);
        
        let notApplicableLabel = "";
        if (activeCategory === 'fork') notApplicableLabel = "Mi bici es Rígida (Sin suspensión)";
        if (activeCategory === 'shock') notApplicableLabel = "No Aplica (Cuadro Rígido)";
        if (activeCategory === 'drivetrain') notApplicableLabel = "No Aplica (Fixie / BMX)";

        return (
            <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-6">
                {/* BOTÓN VOLVER - OPTIMIZADO PARA ANCHO COMPLETO Y AZUL (HCI UX) */}
                <Button 
                    variant="ghost" 
                    onClick={() => setStep('garage')} 
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 font-bold w-full justify-start mb-2 -ml-2"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Volver
                </Button>
                
                <div>
                    <h2 className="text-2xl font-black text-foreground mb-1">¿Qué marca es?</h2>
                    <p className="text-muted-foreground">Selecciona la marca de tu {catData.label.toLowerCase()}.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {brands.map(brand => (
                        <button 
                            key={brand} 
                            onClick={() => handleSelectBrand(brand)}
                            className="border-2 border-border bg-card rounded-xl p-4 flex flex-col items-center justify-center min-h-24 hover:border-primary hover:bg-primary/5 transition-all text-center"
                        >
                            <span className="font-bold text-foreground">{brand}</span>
                        </button>
                    ))}
                </div>

                <div className="pt-6 space-y-3">
                    <Button variant="outline" className="w-full h-12" onClick={() => handleSelectBrand('', true, false)}>
                        No lo sé / Marca Genérica
                    </Button>
                    {notApplicableLabel && (
                        <Button variant="outline" className="w-full h-12 border-dashed" onClick={() => handleSelectBrand('', false, true)}>
                            {notApplicableLabel}
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    const renderModelSelector = () => {
        if (!activeCategory) return null;
        const catData = COMPONENT_CATALOG[activeCategory];
        const selectedBrand = components[activeCategory]?.brand;
        if (!selectedBrand) return null;

        const availableModels = catData.brands[selectedBrand]?.models || [];
        const filteredModels = availableModels.filter(m => m.toLowerCase().includes(searchQuery.toLowerCase()));

        return (
            <div className="animate-in slide-in-from-right-4 duration-300 space-y-6 flex flex-col h-full min-h-[50vh] max-h-[80vh]">
                {/* BOTÓN VOLVER - OPTIMIZADO PARA ANCHO COMPLETO Y AZUL (HCI UX) */}
                <Button 
                    variant="ghost" 
                    onClick={() => setStep('brand')} 
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 font-bold w-full justify-start mb-2 -ml-2 self-start"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Volver
                </Button>
                
                <div>
                    <h2 className="text-2xl font-black text-foreground mb-1">{selectedBrand}</h2>
                    <p className="text-muted-foreground">Selecciona el modelo de {catData.label.toLowerCase()}.</p>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar modelo..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-12 bg-muted/50"
                    />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 pb-10">
                    {filteredModels.length > 0 ? (
                        <>
                            {filteredModels.map(model => (
                                <div 
                                    key={model}
                                    onClick={() => handleSelectModel(model)} 
                                    className="p-4 border border-border bg-card rounded-xl flex justify-between items-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
                                >
                                    <span className="font-bold text-foreground">{model}</span>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                            ))}
                            {/* Válvula de escape al final de la lista */}
                            <div 
                                onClick={() => {
                                    handleComponentUpdate(activeCategory, { model: 'Otro / No listado', isGeneric: true });
                                    setStep('garage');
                                }} 
                                className="p-4 border border-dashed border-border bg-muted/20 rounded-xl flex justify-between items-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
                            >
                                <span className="font-bold text-muted-foreground italic">Otro / No listado</span>
                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4 py-6 text-center">
                            <p className="text-muted-foreground">No se encontraron modelos coincidiendo con "{searchQuery}".</p>
                            <Button 
                                variant="outline"
                                className="w-full h-12"
                                onClick={() => {
                                    handleComponentUpdate(activeCategory, { model: 'Otro / No listado', isGeneric: true });
                                    setStep('garage');
                                }}
                            >
                                Usar "Otro / No listado"
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderFrameMaterialSelector = () => {
        return (
            <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-6">
                {/* BOTÓN VOLVER - OPTIMIZADO PARA ANCHO COMPLETO Y AZUL (HCI UX) */}
                <Button 
                    variant="ghost" 
                    onClick={() => setStep('garage')} 
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 font-bold w-full justify-start mb-2 -ml-2"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Volver
                </Button>
                
                <div>
                    <h2 className="text-2xl font-black text-foreground mb-1">¿De qué material es tu cuadro?</h2>
                    <p className="text-muted-foreground">El cuadro define la identidad estructural de tu bicicleta.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {FRAME_MATERIAL_OPTIONS.map(opt => (
                        <button 
                            key={opt} 
                            onClick={() => {
                                setFrameMaterial(opt as Bike['frameMaterial']);
                                setStep('garage');
                            }}
                            className={cn(
                                "border-2 border-border bg-card rounded-xl p-4 flex flex-col items-center justify-center min-h-24 hover:border-primary hover:bg-primary/5 transition-all text-center",
                                frameMaterial === opt && "border-primary bg-primary/5"
                            )}
                        >
                            <span className="font-bold text-foreground">{opt}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <Card className="border-0 shadow-none sm:border sm:shadow-sm sm:border-border mt-2 overflow-hidden bg-transparent sm:bg-card">
            <CardContent className="p-0 sm:p-6">
                {step === 'garage' && renderGarage()}
                {step === 'brand' && renderBrandSelector()}
                {step === 'model' && renderModelSelector()}
                {step === 'frameMaterial' && renderFrameMaterialSelector()}
            </CardContent>
        </Card>
    );
}