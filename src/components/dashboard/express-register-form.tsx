'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Bike, ShieldCheck, Camera, Sparkles, Tag, Calendar, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { modalityOptions } from '@/lib/bike-types';
import { createExpressBikeAction } from '@/lib/actions/ai-valuation-actions';
import { cn } from '@/lib/utils';

// --- COMPRESIÓN DE IMAGEN ---
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; 
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export function ExpressRegisterForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    // Data persistida desde el cotizador
    const initialBrand = searchParams.get('brand') || '';
    const initialModel = searchParams.get('model') || '';
    const initialYear = searchParams.get('year') || '';
    const initialValue = searchParams.get('value') || '';

    const [loading, setLoading] = useState(false);
    const [color, setColor] = useState('');
    const [type, setType] = useState('');
    const [bikeImage, setBikeImage] = useState<string | null>(null);

    // Si por alguna razón alguien entra directo sin parámetros, redirigir al Dashboard.
    useEffect(() => {
        if (!initialBrand || !initialModel) {
            router.replace('/dashboard');
        }
    }, [initialBrand, initialModel, router]);

    const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setLoading(true);
            try {
                const file = e.target.files[0];
                const base64 = await compressImage(file);
                setBikeImage(base64);
            } catch (err) {
                console.error("Error comprimiendo:", err);
                toast({ variant: "destructive", title: "Error", description: "No pudimos procesar la imagen." });
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSubmit = async () => {
        if (!color || !type || !bikeImage) {
            toast({ 
                variant: "destructive", 
                title: "Faltan datos", 
                description: !bikeImage ? "La foto de la bicicleta es obligatoria para continuar." : "El Color y el Tipo de bicicleta son obligatorios para blindarla." 
            });
            return;
        }

        setLoading(true);

        const payload = {
            brand: initialBrand,
            model: initialModel,
            year: initialYear,
            value: initialValue,
            color,
            type,
            bikeImage
        };

        const result = await createExpressBikeAction(payload);
        setLoading(false);

        if (result.success) {
            toast({ title: "¡Bicicleta Blindada!", description: "Se ha agregado a tu Garaje Digital.", className: "bg-primary text-primary-foreground" });
            
            // Redirigir al dashboard y añadir puntos
            router.push(`/dashboard?points=${result.pointsAwarded || 50}&action_type=express_register`);
        } else {
            toast({ variant: "destructive", title: "Error", description: result.message || "Ocurrió un problema." });
        }
    };

    if (!initialBrand || !initialModel) return null;

    return (
        <Card className="border-0 md:border-2 border-primary/20 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-950 p-8 text-center border-b border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <ShieldCheck className="w-32 h-32 text-primary" />
                </div>
                <div className="relative z-10">
                    <div className="bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/30">
                        <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-black text-white tracking-tight italic uppercase">
                        Confirmación de Blindaje
                    </CardTitle>
                    <CardDescription className="text-white/80 text-base mt-2 font-medium">
                        Crea la identidad digital oficial de tu {initialBrand}
                    </CardDescription>
                </div>
            </div>

            <CardContent className="space-y-8 pt-8 px-6 md:px-10">
                {/* TICKET DE VALUACIÓN ELEGANTE */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative bg-white border border-slate-100 rounded-xl p-6 shadow-sm overflow-hidden">
                        {/* Decoración de Ticket */}
                        <div className="absolute top-0 right-0 h-full w-2 bg-slate-950/5 flex flex-col justify-between py-1 gap-1">
                            {[...Array(12)].map((_, i) => <div key={i} className="w-2 h-2 rounded-full bg-slate-50"></div>)}
                        </div>
                        
                        <div className="flex flex-col gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em]">
                                    <Tag className="w-3 h-3" />
                                    Detalles de la valuación
                                </div>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Marca y Modelo</p>
                                        <p className="font-black text-slate-900 leading-tight">{initialBrand} {initialModel}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Año</p>
                                        <p className="font-black text-slate-900">{initialYear}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-center w-full shadow-inner">
                                <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
                                    <Wallet className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Valor aproximado</span>
                                </div>
                                <div className="text-3xl font-black text-slate-950 tracking-tight">
                                    ${Number(initialValue).toLocaleString()} <span className="text-xs font-bold text-slate-400">MXN</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="color" className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            Color Principal
                        </Label>
                        <Input 
                            id="color"
                            placeholder="Ej. Negro Mate / Rojo" 
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="h-12 border-slate-200 focus-visible:ring-primary font-medium"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                            Tipo de Bicicleta
                        </Label>
                        <Select onValueChange={setType}>
                            <SelectTrigger className="h-12 border-slate-200 focus:ring-primary font-medium">
                                <SelectValue placeholder="Selecciona la modalidad" />
                            </SelectTrigger>
                            <SelectContent>
                                {modalityOptions.map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        Fotografía de la bicicleta <span className="text-primary ml-1">(Requerido)</span>
                    </Label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50 hover:bg-slate-100/50 hover:border-primary/50 transition-all relative overflow-hidden group min-h-[220px] shadow-inner">
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handlePhoto}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {bikeImage ? (
                            <div className="relative w-full h-48 group-hover:opacity-90 transition-all duration-300 scale-95 group-hover:scale-100">
                                <Image src={bikeImage} alt="Bike" fill className="object-cover rounded-xl shadow-lg border-2 border-white" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40 rounded-xl">
                                    <p className="text-white text-xs font-bold bg-slate-950/60 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20 flex items-center gap-2">
                                        <Camera className="w-3 h-3" /> Cambiar foto
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center w-full space-y-3">
                                <div className="bg-white w-14 h-14 rounded-full flex items-center justify-center mx-auto shadow-md border border-slate-100">
                                    <Camera className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-700 font-black uppercase tracking-tight">Toca para subir una foto</p>
                                    <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">Sube una foto lateral donde tu bicicleta luzca increíble.</p>
                                </div>
                            </div>
                        )}
                        {loading && bikeImage === null && (
                            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-20 gap-3">
                                <Loader2 className="animate-spin text-primary w-8 h-8" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">Procesando imagen...</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-amber-50/50 p-5 rounded-xl flex gap-4 text-sm text-amber-900 border border-amber-100/50 shadow-sm">
                    <div className="bg-amber-100 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold">Paso Final del Registro Inteligente</p>
                        <p className="text-xs text-amber-800/80 leading-relaxed">
                            Al guardar, tu bicicleta quedará blindada digitalmente. Podrás agregar el número de serie oficial después desde tu perfil para activar el <span className="font-bold">Certificado Antirrobo.</span>
                        </p>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="bg-slate-50 border-t border-slate-100 p-8 md:p-10">
                <Button 
                    onClick={handleSubmit} 
                    disabled={loading || !color || !type || !bikeImage} 
                    className={cn(
                        "w-full text-lg md:text-xl h-16 shadow-2xl transition-all font-black uppercase tracking-widest italic rounded-xl",
                        !color || !type || !bikeImage 
                            ? "bg-slate-200 text-slate-400" 
                            : "bg-slate-950 hover:bg-primary text-white"
                    )}
                >
                    {loading ? <Loader2 className="animate-spin w-6 h-6 mr-2" /> : <ShieldCheck className="w-6 h-6 mr-2" />}
                    <span className="block md:hidden">Blindar Bicicleta</span>
                    <span className="hidden md:block">Guardar y Blindar Patrimonio</span>
                </Button>
            </CardFooter>
        </Card>
    );
}
