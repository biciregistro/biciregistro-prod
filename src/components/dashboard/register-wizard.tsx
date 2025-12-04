'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Camera, CheckCircle, AlertCircle, Upload, Bike, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// Actions centralizadas
import { analyzeSerialNumberAction, analyzeBikeImageAction } from '@/lib/actions/ai-actions';
import { registerBikeWizardAction, validateSerialNumberAction } from '@/lib/actions'; 
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { bikeBrands } from '@/lib/bike-brands';
import { modalityOptions } from '@/lib/bike-types';

// Tipos básicos para el estado del formulario
type WizardData = {
  serialNumber: string;
  serialImage: string | null;
  bikeImage: string | null;
  brand: string;
  customBrand: string; // Nuevo campo para cuando es "Otra"
  model: string;
  color: string;
  type: string;
  year: string;
  value: string;
};

export function RegisterWizard() {
  const [step, setStep] = useState(0); // Inicia en 0 (Bienvenida)
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<WizardData>({
    serialNumber: '',
    serialImage: null,
    bikeImage: null,
    brand: '',
    customBrand: '',
    model: '',
    color: '',
    type: '',
    year: '',
    value: '',
  });
  const { toast } = useToast();
  const router = useRouter();

  // --- GENERACIÓN DE AÑOS DINÁMICA ---
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: (currentYear + 1) - 1980 + 1 }, (_, i) => (currentYear + 1) - i);


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

  // --- HELPER MATCH BRAND ---
  const matchBrand = (detectedBrand: string): { brand: string, custom?: string } => {
    if (!detectedBrand) return { brand: '' };
    const normalizedDetected = detectedBrand.toLowerCase().trim();
    const match = bikeBrands.find(b => b.toLowerCase() === normalizedDetected);
    if (match) return { brand: match };
    const partialMatch = bikeBrands.find(b => normalizedDetected.includes(b.toLowerCase()) || b.toLowerCase().includes(normalizedDetected));
    if (partialMatch) return { brand: partialMatch };
    return { brand: 'Otra', custom: detectedBrand };
  };

  // --- PASO 1: NÚMERO DE SERIE ---
  const handleSerialPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      try {
        const file = e.target.files[0];
        const base64 = await compressImage(file);
        
        setFormData(prev => ({ ...prev, serialImage: base64 }));

        const result = await analyzeSerialNumberAction(base64);
        
        if (result.success && result.serialNumber) {
           setFormData(prev => ({ ...prev, serialNumber: result.serialNumber }));
           toast({ title: "Número detectado", description: `Hemos leído: ${result.serialNumber}`, className: "bg-green-50 border-green-200" });
        } else {
           console.warn("OCR no detectó nada:", result.error);
           toast({ 
             variant: "default", 
             title: "No pudimos leer el número automáticamente", 
             description: "La imagen puede estar borrosa o el número sucio. Por favor ingrésalo manualmente." 
           });
        }
      } catch (err) {
        console.error("Error cliente:", err);
        toast({ variant: "destructive", title: "Error", description: "Hubo un problema procesando la imagen." });
      } finally {
        setLoading(false);
      }
    }
  };

  const validateStep1 = async () => {
    if (!formData.serialNumber || formData.serialNumber.length < 3) {
      toast({ variant: "destructive", title: "Número inválido", description: "El número de serie es muy corto." });
      return;
    }
    
    setLoading(true);
    const check = await validateSerialNumberAction(formData.serialNumber);
    setLoading(false);

    if (check.exists) {
      toast({ variant: "destructive", title: "¡Ya registrado!", description: check.message });
    } else {
      setStep(2);
    }
  };

  // --- PASO 2: FOTO DE LA BICI & IA ---
  const handleBikePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      try {
        const file = e.target.files[0];
        const base64 = await compressImage(file);
        
        setFormData(prev => ({ ...prev, bikeImage: base64 }));

        const result = await analyzeBikeImageAction(base64);
        
        if (result.success && result.data) {
            
            const brandMatch = matchBrand(result.data.brand || '');
            
            const hasData = result.data.brand || result.data.model || result.data.color;

            if (hasData) {
                 setFormData(prev => ({ 
                    ...prev, 
                    brand: brandMatch.brand || prev.brand,
                    customBrand: brandMatch.custom || prev.customBrand,
                    model: result.data.model || prev.model,
                    color: result.data.color || prev.color
                }));
                toast({ title: "Bicicleta analizada", description: "Sprock ha detectado las características.", className: "bg-green-50 border-green-200" });
            } else {
                 toast({ variant: "default", title: "Sin detalles claros", description: "La IA vio la imagen pero no pudo distinguir marca o modelo. Por favor ingresalos." });
            }

        } else {
             console.warn("IA Vision falló:", result.error);
             toast({ title: "No pudimos detectar detalles", description: "Por favor completa los datos manualmente.", variant: "default" });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const validateStep2 = () => {
    if (!formData.brand || (formData.brand === 'Otra' && !formData.customBrand) || !formData.color) {
        toast({ variant: "destructive", title: "Faltan datos", description: "Marca y Color son obligatorios." });
        return;
    }
    setStep(3);
  };

  // --- PASO 3: FINALIZAR ---
  const handleRegister = async () => {
    if (!formData.type || !formData.value || !formData.year) {
        toast({ variant: "destructive", title: "Campos incompletos", description: "Por favor completa todos los campos." });
        return;
    }
    
    const finalBrand = formData.brand === 'Otra' ? formData.customBrand : formData.brand;
    
    const payload = {
        ...formData,
        brand: finalBrand
    };

    setLoading(true);
    const result = await registerBikeWizardAction(payload);
    setLoading(false);

    if (result.success) {
        toast({ title: "¡Registro Exitoso!", description: "Tu bicicleta está protegida.", className: "bg-green-600 text-white" });
        router.push('/dashboard');
    } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
    }
  };

  return (
    <div className="w-full">
      {/* Progress Bar Simple - Oculto en paso 0 */}
      {step > 0 && (
        <div className="flex justify-between mb-8 relative px-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="absolute top-1/2 left-4 right-4 h-1 bg-gray-200 -z-10 -translate-y-1/2 rounded-full"></div>
            {[1, 2, 3].map((s) => (
                <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${step >= s ? 'bg-primary text-white scale-110 shadow-md' : 'bg-gray-200 text-gray-500'}`}>
                    {s}
                </div>
            ))}
        </div>
      )}

      <Card className="border-2 border-primary/10 shadow-lg">
        
        {/* --- STEP 0: BIENVENIDA --- */}
        {step === 0 && (
            <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-8">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                        <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                    </div>
                    <CardTitle className="text-3xl font-bold text-primary">Bienvenido al Registro Inteligente</CardTitle>
                    <CardDescription className="text-lg mt-2">
                        Estás a punto de registrar tu bicicleta.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-w-md mx-auto">
                    <p className="text-gray-600">
                        <span className="font-semibold text-primary">Sprock</span>, nuestra IA, te acompañará en el proceso para registrar tu bici en 2 minutos o menos.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 flex items-center gap-3 text-left">
                        <Bike className="w-8 h-8 shrink-0" />
                        <span>Por favor, <b>ten a la mano tu bicicleta</b> para escanear el número de serie y tomarle una foto.</span>
                    </div>
                </CardContent>
                <CardFooter className="justify-center pb-8">
                    <Button size="lg" onClick={() => setStep(1)} className="w-full sm:w-auto px-12 text-lg h-12 shadow-md hover:shadow-xl transition-all">
                        Comenzar
                    </Button>
                </CardFooter>
            </div>
        )}

        {/* --- HEADERS PARA PASOS 1-3 --- */}
        {step > 0 && (
            <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                    {step === 1 && "1. Escanea el Número de Serie"}
                    {step === 2 && "2. Toma una foto lateral"}
                    {step === 3 && "3. Detalles Finales"}
                </CardTitle>
                <CardDescription>
                    {step === 1 && "Empecemos por lo más importante. Escanea el número de serie de tu bici y deja que Sprock nuestra IA lo escriba por ti."}
                    {step === 2 && "Toma una foto lateral de tu bicicleta, Sprock intentará reconocerla."}
                    {step === 3 && "Solo unos datos más para estimar su valor."}
                </CardDescription>
            </CardHeader>
        )}
        
        <CardContent className="space-y-6">
            
            {/* --- STEP 1 CONTENT --- */}
            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gray-50 hover:bg-gray-100 transition-colors relative overflow-hidden group min-h-[250px]">
                        <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            onChange={handleSerialPhoto}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {formData.serialImage ? (
                            <div className="relative w-full h-48 group-hover:opacity-90 transition-opacity">
                                <Image src={formData.serialImage} alt="Serial" fill className="object-contain" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                    <p className="text-white font-medium bg-black/50 px-3 py-1 rounded-full">Cambiar foto</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center w-full">
                                <Camera className="w-12 h-12 text-primary/60 mx-auto mb-3" />
                                <p className="text-base text-gray-700 font-semibold mb-1">Toca para escanear el número</p>
                                <p className="text-xs text-gray-400 mb-4">Suele estar bajo la caja de pedalier</p>
                                
                                <div className="bg-white/80 p-3 rounded-lg border text-left text-xs text-gray-600 space-y-2 max-w-xs mx-auto shadow-sm">
                                    <p className="font-semibold text-gray-800">Para mejor resultado:</p>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                        <span>Limpia el número de grasa o polvo</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                        <span>Asegura buena iluminación</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                        <span>Enfoca bien el texto</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {loading && <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-20 gap-2">
                            <Loader2 className="animate-spin text-primary w-8 h-8" />
                            <p className="text-sm font-medium text-gray-600 animate-pulse">Analizando imagen...</p>
                        </div>}
                    </div>

                    <div className="space-y-2">
                        <Label>Número de Serie detectado</Label>
                        <Input 
                            value={formData.serialNumber} 
                            onChange={(e) => setFormData({...formData, serialNumber: e.target.value.toUpperCase()})}
                            placeholder="Ej. WTU1234567"
                            className="text-lg font-mono tracking-widest uppercase border-primary/20 focus:border-primary h-12"
                        />
                        <div className="flex gap-2 items-start text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                            <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                            <p>Verifica que el número coincida exactamente con el de tu bicicleta. Si la IA falló, corrígelo manualmente aquí.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- STEP 2 CONTENT --- */}
            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 bg-gray-50 hover:bg-gray-100 transition-colors relative overflow-hidden min-h-[250px]">
                        <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment" 
                            onChange={handleBikePhoto}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {formData.bikeImage ? (
                            <div className="relative w-full h-48">
                                <Image src={formData.bikeImage} alt="Bike" fill className="object-contain" />
                            </div>
                        ) : (
                            <div className="text-center">
                                <Bike className="w-12 h-12 text-primary/60 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 font-medium">Sube una foto lateral completa</p>
                            </div>
                        )}
                        {loading && <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-20 gap-2">
                            <Loader2 className="animate-spin text-primary w-8 h-8" />
                            <p className="text-sm font-medium text-gray-600 animate-pulse">Identificando bici...</p>
                        </div>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Marca</Label>
                             <Select 
                                value={formData.brand} 
                                onValueChange={(val) => setFormData({...formData, brand: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona la marca" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {bikeBrands.map((b) => (
                                        <SelectItem key={b} value={b}>{b}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {/* Campo adicional si la marca es "Otra" */}
                        {formData.brand === 'Otra' && (
                             <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2">
                                <Label>Escribe la marca</Label>
                                <Input 
                                    value={formData.customBrand} 
                                    onChange={(e) => setFormData({...formData, customBrand: e.target.value})}
                                    placeholder="Ej. Mi Marca Personalizada"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Modelo</Label>
                            <Input 
                                value={formData.model} 
                                onChange={(e) => setFormData({...formData, model: e.target.value})}
                                placeholder="Ej. Marlin 7"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <Input 
                                value={formData.color} 
                                onChange={(e) => setFormData({...formData, color: e.target.value})}
                                placeholder="Ej. Rojo Mate"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* --- STEP 3 CONTENT --- */}
            {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo de Bicicleta (Modalidad)</Label>
                            <Select onValueChange={(val) => setFormData({...formData, type: val})}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {modalityOptions.map(option => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Año del Modelo</Label>
                            <Select onValueChange={(val) => setFormData({...formData, year: val})}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Año..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(year => (
                                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Valor Estimado ($)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <Input 
                                    type="number" 
                                    value={formData.value} 
                                    onChange={(e) => setFormData({...formData, value: e.target.value})}
                                    placeholder="Ej. 15000"
                                    className="pl-7"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">Esto ayuda en caso de recuperación o seguro.</p>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg flex gap-3 items-start text-blue-800 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>No te preocupes por la factura ahora. Podrás subirla después desde tu perfil para verificar la propiedad oficialmente.</p>
                    </div>
                </div>
            )}

        </CardContent>
        {step > 0 && (
            <CardFooter className="flex justify-between border-t p-6 bg-gray-50/50">
                {step > 1 ? (
                    <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
                        Atrás
                    </Button>
                ) : (
                    <div></div> // Spacer
                )}

                {step === 1 && (
                    <Button onClick={validateStep1} disabled={loading || !formData.serialNumber} className="w-full sm:w-auto">
                        {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                        Confirmar y Siguiente
                    </Button>
                )}

                {step === 2 && (
                    <Button onClick={validateStep2} disabled={loading} className="w-full sm:w-auto">
                        Confirmar y Siguiente
                    </Button>
                )}

                {step === 3 && (
                    <Button onClick={handleRegister} disabled={loading} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                        {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                        Finalizar Registro
                    </Button>
                )}
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
