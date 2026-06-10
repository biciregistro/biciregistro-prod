'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, PlusCircle, Calendar as CalendarIcon, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function StepSerialStagesStructure() {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "stages",
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div>
        <h2 className="text-xl font-semibold mb-1">Estructura de Fechas</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Define las carreras que compondrán este campeonato. El sistema generará eventos individuales en borrador para cada una de estas fechas.
        </p>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <Card key={field.id} className="relative overflow-visible">
            {index > 0 && (
                <div className="absolute -top-4 left-6 h-4 w-px bg-border z-0"></div>
            )}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold z-10 shadow-sm border-2 border-background">
                {index + 1}
            </div>
            
            <CardContent className="p-4 pl-8">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                    <FormField
                        control={control}
                        name={`stages.${index}.date`}
                        render={({ field }) => (
                            <FormItem className="flex-1 w-full">
                                <FormLabel className="flex items-center gap-2"><CalendarIcon className="w-4 h-4"/> Fecha de la Carrera</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={control}
                        name={`stages.${index}.price`}
                        render={({ field }) => (
                            <FormItem className="flex-1 w-full">
                                <FormLabel className="flex items-center gap-2"><DollarSign className="w-4 h-4"/> Costo Base (MXN)</FormLabel>
                                <FormControl>
                                    <Input type="number" min="0" placeholder="0 = Gratuito" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {fields.length > 1 && (
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => remove(index)}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed border-2 bg-muted/30 hover:bg-muted/60"
        onClick={() => append({ date: '', price: 0 })}
      >
        <PlusCircle className="w-4 h-4 mr-2" />
        Agregar nueva etapa al serial
      </Button>
    </div>
  );
}
