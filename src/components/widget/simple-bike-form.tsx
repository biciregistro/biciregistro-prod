'use client';

import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { bikeBrands } from '@/lib/bike-brands';
import { modalityOptions } from '@/lib/bike-types';
import { registerBikeWizardAction } from '@/lib/actions'; 
import Image from 'next/image';

const simpleBikeSchema = z.object({
  serialNumber: z.string().min(3, "El número de serie es importante para recuperarla."),
  brand: z.string().min(1, "Selecciona una marca"),
  customBrand: z.string().optional(),
  model: z.string().min(1, "El modelo es obligatorio"),
  color: z.string().min(1, "El color es obligatorio"),
  type: z.string().min(1, "El tipo es obligatorio"),
  year: z.string().min(4, "Selecciona un año"),
  value: z.string().min(1, "El valor estimado es requerido"),
  // La imagen ya no se valida aquí como FileList, sino que gestionamos el string base64 aparte o permitimos any
  bikeImage: z.any().optional(), 
});

type SimpleBikeValues = z.infer<typeof simpleBikeSchema>;

interface SimpleBikeFormProps {
  onSuccess: (bikeData: any) => void;
}

// Función auxiliar de compresión
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = document.createElement('img');
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
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
                // Comprimir a JPEG con calidad 0.8
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

export function SimpleBikeForm({ onSuccess }: SimpleBikeFormProps) {
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressedImageBase64, setCompressedImageBase64] = useState<string | null>(null);
  
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: (currentYear + 1) - 1980 + 1 }, (_, i) => (currentYear + 1) - i);

  const form = useForm<SimpleBikeValues>({
    resolver: zodResolver(simpleBikeSchema),
    defaultValues: {
      serialNumber: '',
      brand: '',
      customBrand: '',
      model: '',
      color: '',
      type: '',
      year: '',
      value: '',
    },
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
          setImagePreview(null);
          setCompressedImageBase64(null);
          form.setValue('bikeImage', null);
          return;
      }

      // Validaciones básicas antes de procesar
      if (!file.type.startsWith('image/')) {
          toast({ variant: "destructive", title: "Formato inválido", description: "Por favor selecciona un archivo de imagen (JPG, PNG)." });
          return;
      }

      setCompressing(true);
      // Limpiamos preview anterior mientras procesamos
      setImagePreview(null); 

      try {
          // Comprimir
          const compressed = await compressImage(file);
          
          setCompressedImageBase64(compressed);
          setImagePreview(compressed);
          
          // Actualizar el form con algo (simbólico) para que sepa que hay imagen, 
          // aunque usaremos el base64 en onSubmit
          form.setValue('bikeImage', "image_ready"); 
      } catch (error) {
          console.error("Error al procesar imagen:", error);
          toast({ variant: "destructive", title: "Error", description: "No pudimos procesar la imagen. Intenta con otra." });
          setImagePreview(null);
          setCompressedImageBase64(null);
          form.setValue('bikeImage', null);
      } finally {
          setCompressing(false);
      }
  };

  const clearImage = () => {
      setImagePreview(null);
      setCompressedImageBase64(null);
      form.setValue('bikeImage', null);
      const fileInput = document.getElementById('bike-image-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
  };

  const onSubmit = async (data: SimpleBikeValues) => {
    setLoading(true);
    try {
      const finalBrand = data.brand === 'Otra' ? data.customBrand : data.brand;

      const payload = {
        serialNumber: data.serialNumber.toUpperCase(),
        brand: finalBrand,
        model: data.model,
        color: data.color,
        type: data.type,
        year: data.year,
        value: data.value,
        bikeImage: compressedImageBase64, // Enviamos la versión optimizada
        serialImage: null, 
      };

      const result = await registerBikeWizardAction(payload);

      if (result.success) {
        toast({ title: "Bicicleta Registrada", description: "Ahora reportemos los detalles del robo." });
        onSuccess(payload); 
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Ocurrió un error inesperado." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        
        <FormField
          control={form.control}
          name="serialNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Serie</FormLabel>
              <FormControl>
                <Input placeholder="Ej. WTU1234567" {...field} className="uppercase font-mono" />
              </FormControl>
              <FormDescription className="text-xs">
                Lo encuentras usualmente debajo de los pedales.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Marca</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {bikeBrands.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej. Marlin 5" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        {form.watch('brand') === 'Otra' && (
             <FormField
                control={form.control}
                name="customBrand"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Escribe la marca</FormLabel>
                    <FormControl>
                        <Input placeholder="Tu marca" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}

        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej. Rojo" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {modalityOptions.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Año</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Año" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {years.map((y) => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Valor ($)</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <FormField
          control={form.control}
          name="bikeImage"
          render={({ field: { value, onChange, ...fieldProps } }) => (
            <FormItem>
              <FormLabel>Foto de la bicicleta (Opcional)</FormLabel>
              <FormControl>
                <div className="space-y-3">
                    {!imagePreview && !compressing ? (
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="bike-image-input" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                                    <p className="text-xs text-gray-500 font-medium text-center">Toca para subir foto</p>
                                    <p className="text-[10px] text-gray-400 mt-1 text-center">Optimizamos tu imagen automáticamente</p>
                                </div>
                                <Input
                                    {...fieldProps}
                                    id="bike-image-input"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleImageChange(e)}
                                    // Removemos onChange del spread para manejarlo manualmente
                                    value="" // Forzar reset para permitir re-selección del mismo archivo si se limpia
                                />
                            </label>
                        </div>
                    ) : (
                        <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-gray-50 flex items-center justify-center">
                             {compressing ? (
                                 <div className="flex flex-col items-center gap-2 text-gray-500 animate-in fade-in duration-300">
                                     <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                     <span className="text-xs font-medium">Procesando imagen...</span>
                                 </div>
                             ) : (
                                <>
                                    {imagePreview && (
                                        <div className="relative w-full h-full">
                                            <Image 
                                                src={imagePreview} 
                                                alt="Preview" 
                                                fill 
                                                className="object-contain p-2" 
                                            />
                                        </div>
                                    )}
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md z-10"
                                        onClick={clearImage}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                                        <ImageIcon className="w-3 h-3" /> Lista para subir
                                    </div>
                                </>
                             )}
                        </div>
                    )}
                </div>
              </FormControl>
              <FormDescription className="text-xs">
                Se recomienda una foto clara del costado de la bici.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={loading || compressing}>
            {loading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando...
                </>
            ) : (
                'Registrar y Continuar'
            )}
        </Button>
      </form>
    </Form>
  );
}
