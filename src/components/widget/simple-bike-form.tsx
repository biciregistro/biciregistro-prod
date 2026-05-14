'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from "@/hooks/use-toast";
import { bikeBrands } from '@/lib/bike-brands';
import { modalityOptions } from '@/lib/bike-types';
import { registerBikeWizardAction } from '@/lib/actions'; 
import Image from 'next/image';
import { ModelCombobox } from '@/components/shared/model-combobox'; // <-- Componente reutilizable

const simpleBikeSchema = z.object({
  serialNumber: z.string().min(3, "El número de serie es importante para recuperarla."),
  brand: z.string().min(1, "Selecciona una marca"),
  customBrand: z.string().optional(),
  model: z.string().min(1, "El modelo es obligatorio"),
  color: z.string().min(1, "El color es obligatorio"),
  type: z.string().min(1, "El tipo es obligatorio"),
  year: z.string().min(4, "Selecciona un año"),
  value: z.string().min(1, "El valor estimado es requerido"),
  bikeImage: z.any().refine((val) => val !== null && val !== undefined && val !== "", {
    message: "La fotografía de la bicicleta es obligatoria para el reporte.",
  }), 
});

type SimpleBikeValues = z.infer<typeof simpleBikeSchema>;

interface SimpleBikeFormProps {
  onSuccess: (bikeData: any, pointsAwarded?: number) => void;
}

const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;
                if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
                else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

export function SimpleBikeForm({ onSuccess }: SimpleBikeFormProps) {
  const [loading, setLoading] = useState(false);
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

  const selectedBrand = form.watch('brand');

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
          setImagePreview(null);
          setCompressedImageBase64(null);
          form.setValue('bikeImage', null);
          return;
      }
      if (!file.type.startsWith('image/')) {
          toast({ variant: "destructive", title: "Formato inválido", description: "Por favor selecciona un archivo de imagen (JPG, PNG)." });
          return;
      }
      try {
          const objectUrl = URL.createObjectURL(file);
          setImagePreview(objectUrl);
          const compressedBase64 = await compressImage(file);
          setCompressedImageBase64(compressedBase64);
          form.setValue('bikeImage', compressedBase64);
          form.clearErrors('bikeImage');
      } catch (error) {
          console.error("Error compressing image:", error);
          toast({ variant: "destructive", title: "Error", description: "Hubo un problema al procesar la imagen." });
      }
  };

  const onSubmit = async (data: SimpleBikeValues) => {
    if (!compressedImageBase64) {
        form.setError('bikeImage', { message: 'La imagen es obligatoria.' });
        return;
    }
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
        bikeImage: compressedImageBase64,
        serialImage: null, 
      };
      const result = await registerBikeWizardAction(payload);
      if (result.success) {
        toast({ title: "Bicicleta Registrada", description: "El registro ha sido exitoso." });
        onSuccess(payload, result.pointsAwarded); 
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Hubo un problema al procesar la solicitud." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
            control={form.control}
            name="bikeImage"
            render={() => (
                <FormItem className="col-span-full">
                    <FormLabel>Fotografía de la Bicicleta <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                        <div className="flex items-center gap-4">
                            <Label 
                                htmlFor="bikeImageInput" 
                                className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-slate-50 transition-colors"
                            >
                                <Input id="bikeImageInput" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                <span className="text-sm font-medium text-slate-600">{imagePreview ? 'Cambiar fotografía' : 'Subir foto reciente'}</span>
                                <span className="text-xs text-slate-400 mt-1">JPG, PNG (máx 10MB)</span>
                            </Label>
                            {imagePreview && (
                                <div className="w-24 h-24 relative rounded-md overflow-hidden border flex-shrink-0">
                                    <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                                </div>
                            )}
                        </div>
                    </FormControl>
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
                <Select 
                    onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue('model', ''); // Reset model on brand change
                    }} 
                    defaultValue={field.value}
                >
                    <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
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
                    <FormItem className="flex flex-col justify-end">
                    <FormLabel className="mb-2">Modelo</FormLabel>
                    <ModelCombobox 
                        brand={selectedBrand}
                        value={field.value}
                        onChange={field.onChange}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">⚠️ No incluyas talla, color, año o componentes.</p>
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
                    <FormControl><Input placeholder="Tu marca" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}

        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Año Modelo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
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
                name="type"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tipo de Bicicleta</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {modalityOptions.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
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
                name="color"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Color Primario</FormLabel>
                    <FormControl><Input placeholder="Ej. Rojo" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>No. de Serie</FormLabel>
                    <FormControl><Input placeholder="Alfanumérico" {...field} className="uppercase" /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

         <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Valor de Compra (MXN)</FormLabel>
                <FormControl><Input type="number" placeholder="Ej. 15000" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Procesando...' : 'Crear Registro'}
        </Button>
      </form>
    </Form>
  );
}
