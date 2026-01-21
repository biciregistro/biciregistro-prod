'use client';

import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Loader2, Upload, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { bikeBrands } from '@/lib/bike-brands';
import { modalityOptions } from '@/lib/bike-types';
import { registerBikeWizardAction } from '@/lib/actions'; // Reutilizamos la acción que ya maneja la creación

const simpleBikeSchema = z.object({
  serialNumber: z.string().min(3, "El número de serie es importante para recuperarla."),
  brand: z.string().min(1, "Selecciona una marca"),
  customBrand: z.string().optional(),
  model: z.string().min(1, "El modelo es obligatorio"),
  color: z.string().min(1, "El color es obligatorio"),
  type: z.string().min(1, "El tipo es obligatorio"),
  year: z.string().min(4, "Selecciona un año"),
  value: z.string().min(1, "El valor estimado es requerido"),
  // En este formulario simple, la foto podría ser opcional si es urgente, 
  // pero para recuperación es vital. La haremos requerida pero simple.
  bikeImage: z.any().optional(), 
});

type SimpleBikeValues = z.infer<typeof simpleBikeSchema>;

interface SimpleBikeFormProps {
  onSuccess: (bikeData: any) => void;
}

export function SimpleBikeForm({ onSuccess }: SimpleBikeFormProps) {
  const [loading, setLoading] = useState(false);
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

  const onSubmit = async (data: SimpleBikeValues) => {
    setLoading(true);
    try {
      // Preparar payload compatible con la acción existente
      // Necesitamos convertir la imagen a base64 si existe
      let imageBase64 = null;
      if (data.bikeImage && data.bikeImage[0]) {
        const file = data.bikeImage[0];
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target?.result);
            reader.readAsDataURL(file);
        });
      }

      const finalBrand = data.brand === 'Otra' ? data.customBrand : data.brand;

      const payload = {
        serialNumber: data.serialNumber.toUpperCase(),
        brand: finalBrand,
        model: data.model,
        color: data.color,
        type: data.type,
        year: data.year,
        value: data.value,
        bikeImage: imageBase64,
        serialImage: null, // No pedimos foto del serial en el flujo rápido
      };

      const result = await registerBikeWizardAction(payload);

      if (result.success) {
        toast({ title: "Bicicleta Registrada", description: "Ahora reportemos los detalles del robo." });
        // Importante: La acción actual no devuelve el ID de la bici creada.
        // Pero como acabamos de crearla, es la más reciente del usuario.
        // El componente padre manejará la búsqueda de la bici recién creada.
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
                <Input
                  {...fieldProps}
                  placeholder="Picture"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    onChange(event.target.files && event.target.files);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Bicicleta
        </Button>
      </form>
    </Form>
  );
}
