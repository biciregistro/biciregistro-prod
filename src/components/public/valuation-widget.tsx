'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Zap, ShieldCheck, Bike as BikeIcon, Search, Calendar, Tag, Sparkles, ShieldAlert, TrendingUp } from 'lucide-react';
import { bikeBrands } from '@/lib/bike-brands';
import { valuateBikeAction } from '@/lib/actions/ai-valuation-actions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => currentYear - i);

interface ValuationWidgetProps {
    isAuthenticated?: boolean;
}

export function ValuationWidget({ isAuthenticated = false }: ValuationWidgetProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState<'form' | 'loading' | 'result'>('form');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
    const [loadingState, setLoadingState] = useState({
        text: 'Sprock está analizando el mercado actual...',
        progress: 10,
        icon: <Search className="w-5 h-5" />
    });

    // Simulador de Textos de Carga con mayor impacto visual
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (step === 'loading') {
            const sequence = [
                { text: 'Iniciando conexión con Sprock IA...', progress: 15, icon: <Zap className="w-5 h-5 text-yellow-500" /> },
                { text: 'Analizando congruencia de marca y modelo...', progress: 35, icon: <ShieldCheck className="w-5 h-5 text-primary" /> },
                { text: 'Comparando precios de reventa en México...', progress: 60, icon: <TrendingUp className="w-5 h-5 text-primary" /> },
                { text: 'Ajustando depreciación por el año...', progress: 85, icon: <Calendar className="w-5 h-5 text-orange-500" /> },
                { text: '¡Valuación patrimonial lista!', progress: 100, icon: <Sparkles className="w-5 h-5 text-purple-500" /> }
            ];
            let index = 0;
            interval = setInterval(() => {
                index++;
                if (index < sequence.length) {
                    setLoadingState(sequence[index]);
                }
            }, 1000); 
        }
        return () => clearInterval(interval);
    }, [step]);

    const handleCotizar = async () => {
        if (!brand || !model || !year) return;

        setStep('loading');
        setLoadingState({ text: 'Iniciando conexión con Sprock IA...', progress: 10, icon: <Zap className="w-5 h-5 text-yellow-500" /> });

        // Llamamos a la API en paralelo a la animación
        const resultPromise = valuateBikeAction(brand, model, year);
        
        // Esperamos a que termine la API, pero garantizamos un tiempo mínimo de espera para la animación
        const minimumAnimationTime = new Promise(resolve => setTimeout(resolve, 4500));

        const [result] = await Promise.all([resultPromise, minimumAnimationTime]);

        if (result.success && result.minPrice && result.maxPrice) {
            setPriceRange({ min: result.minPrice, max: result.maxPrice });
            setStep('result');
        } else if (result.isInvalidInput) {
            // El usuario ingresó una bici falsa o modelo equivocado (Ej. Trek PlayStation)
            toast({
                variant: "destructive",
                title: "⚠️ Intervención de Sprock IA",
                description: result.message || "El modelo no parece corresponder a la marca. Por favor verifica.",
                duration: 7000, // Darle tiempo al usuario para leer el sarcasmo o la corrección
            });
            setStep('form'); // Regresar inmediatamente al formulario
        } else {
             // Falla de red genérica o timeout del LLM
             toast({
                variant: "destructive",
                title: "Error de conexión",
                description: result.message || "Tuvimos un problema procesando la valuación. Intenta de nuevo.",
            });
            setStep('form'); // Regresar al formulario sin mostrar datos "hardcodeados" falsos
        }
    };

    const handleBlindar = () => {
        const averageValue = priceRange ? Math.round((priceRange.min + priceRange.max) / 2) : 0;
        const encodedBrand = encodeURIComponent(brand);
        const encodedModel = encodeURIComponent(model);
        
        // Construimos la ruta de destino interna (el registro express)
        const expressRegisterPath = `/dashboard/express-register?brand=${encodedBrand}&model=${encodedModel}&year=${year}&value=${averageValue}`;
        
        if (isAuthenticated) {
            router.push(expressRegisterPath);
        } else {
            const signupUrl = `/signup?callbackUrl=${encodeURIComponent(expressRegisterPath)}`;
            router.push(signupUrl);
        }
    };

    if (step === 'loading') {
        return (
            <div className="bg-background/95 backdrop-blur-md p-10 rounded-2xl max-w-xl mx-auto border shadow-2xl flex flex-col items-center justify-center min-h-[350px] animate-in fade-in zoom-in duration-500 overflow-hidden relative">
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
                    <div className="w-full h-1 bg-primary shadow-[0_0_15px_rgba(var(--primary),1)] absolute animate-scan-y top-0"></div>
                </div>

                <div className="relative mb-8">
                    <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <BikeIcon className="w-10 h-10 text-primary" />
                    </div>
                </div>

                <div className="text-center space-y-4 relative z-10">
                    <div className="flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                        {loadingState.icon}
                        <span>{loadingState.progress}% Completado</span>
                    </div>
                    <p className="text-xl font-bold text-foreground transition-all duration-500">
                        {loadingState.text}
                    </p>
                    <div className="w-64 bg-secondary h-1.5 mx-auto rounded-full overflow-hidden">
                        <div 
                            className="bg-primary h-full rounded-full transition-all duration-700 ease-out" 
                            style={{ width: `${loadingState.progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'result' && priceRange) {
        return (
            <div className="bg-background/95 backdrop-blur-md p-0 rounded-2xl max-w-xl mx-auto border border-primary/20 shadow-2xl animate-in fade-in zoom-in duration-700 overflow-hidden">
                <div className="p-8 text-center bg-gradient-to-b from-primary/5 to-transparent">
                    <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4 ring-8 ring-primary/5">
                        <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Valuación Digital Finalizada</h3>
                    
                    <div className="space-y-1 mb-4">
                        <p className="text-sm text-muted-foreground">Valor estimado de tu {brand}:</p>
                        <div className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-700 py-1">
                            ${priceRange.min.toLocaleString()} - ${priceRange.max.toLocaleString()}
                        </div>
                        <p className="text-xs font-bold text-primary uppercase tracking-widest">Pesos Mexicanos (MXN)</p>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-primary font-semibold bg-primary/10 w-fit mx-auto px-4 py-1.5 rounded-full text-sm border border-primary/20">
                        <Sparkles className="w-4 h-4 fill-current" />
                        ¡Mantiene un excelente valor comercial!
                    </div>
                </div>

                <div className="bg-slate-900 p-8 text-white text-left relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10 translate-x-1/4 -translate-y-1/4">
                         <ShieldCheck className="w-48 h-48" />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-amber-400 mb-3 md:mb-4 font-bold text-sm uppercase tracking-widest">
                            <ShieldAlert className="w-5 h-5 shrink-0" />
                            <span>Alerta de Seguridad Patrimonial</span>
                        </div>
                        
                        <h4 className="text-xl font-bold mb-3 leading-tight text-white">
                            No dejes ${priceRange.max.toLocaleString()} pesos a la suerte.
                        </h4>
                        
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed text-balance">
                            En México, solo el 2% de las bicicletas robadas sin registro logran ser recuperadas. Blinda tu inversión hoy, genera tu <span className="text-white font-semibold italic">Certificado Oficial Antirrobo</span> y gana <span className="text-primary font-bold">1,000 Kilómetros</span> de bienvenida.
                        </p>

                        <Button 
                            onClick={handleBlindar} 
                            size="lg" 
                            className="w-full text-lg h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all hover:scale-[1.02]"
                        >
                            <ShieldCheck className="w-6 h-6 mr-2" /> Blindar mi Patrimonio
                        </Button>
                        
                        <p className="text-[10px] text-slate-500 mt-4 text-center uppercase tracking-widest font-medium">
                            Protección institucional avalada por BiciRegistro.mx
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-2 max-w-xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-left">
                <div className="space-y-2 group">
                    <Label htmlFor="brand-select" className="text-foreground flex items-center gap-1.5 ml-1 font-medium">
                        <Tag className="w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        Marca
                    </Label>
                    <Select value={brand} onValueChange={setBrand}>
                        <SelectTrigger id="brand-select" className="bg-background border-muted-foreground/20 hover:border-primary/50 transition-all h-11">
                            <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                            {bikeBrands.map((b) => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 group">
                    <Label htmlFor="model-input" className="text-foreground flex items-center gap-1.5 ml-1 font-medium">
                        <BikeIcon className="w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        Modelo
                    </Label>
                    <Input 
                        id="model-input"
                        placeholder="Ej. Marlin 5" 
                        value={model} 
                        onChange={(e) => setModel(e.target.value)} 
                        className="bg-background border-muted-foreground/20 focus-visible:ring-primary focus-visible:border-primary h-11"
                    />
                </div>

                <div className="space-y-2 md:col-span-2 group">
                    <Label htmlFor="year-select" className="text-foreground flex items-center gap-1.5 ml-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        Año Modelo
                    </Label>
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger id="year-select" className="bg-background border-muted-foreground/20 hover:border-primary/50 transition-all h-11">
                            <SelectValue placeholder="Selecciona el año" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                            {years.map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Button 
                onClick={handleCotizar} 
                size="lg" 
                className={cn(
                    "w-full text-lg h-14 font-bold shadow-xl transition-all duration-300 relative overflow-hidden group",
                    brand && model && year 
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20" 
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
                disabled={!brand || !model || !year}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <span className="flex items-center justify-center relative z-10">
                    Cotizar mi Bici con Sprock IA <Zap className="w-5 h-5 ml-2 fill-current animate-pulse text-yellow-300" />
                </span>
            </Button>
            
            <div className="flex items-center justify-center gap-4 mt-4 opacity-70">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-tighter font-bold text-muted-foreground">
                    <ShieldCheck className="w-3 h-3" /> Gratuito
                </div>
                <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-tighter font-bold text-muted-foreground">
                    <ShieldCheck className="w-3 h-3" /> Confidencial
                </div>
                <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-tighter font-bold text-muted-foreground">
                    <ShieldCheck className="w-3 h-3" /> grounding Real
                </div>
            </div>
        </div>
    );
}
