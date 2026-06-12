'use client';

import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, AlertCircle, Clock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cities } from '@/lib/cities';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImageUpload } from '@/components/shared/image-upload';
import { cn } from '@/lib/utils';

const MEXICAN_STATES = Object.keys(cities['México'] || {}).sort();
const modalityOptions = ["Urbana", "Gravel", "Pista", "XC", "Enduro", "Downhill", "Trail", "E-Bike", "Dirt Jump", "MTB", "Ruta"];
const levels = ['Principiante', 'Intermedio', 'Avanzado'];

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <span>
    {children} <span className="text-red-500">*</span>
  </span>
);

export function StepSerialGeneralInfo() {
  const { control, watch, setValue, formState } = useFormContext();
  const nameValue = watch('name');

  const { fields: categoryFields, append: appendCategory, remove: removeCategory } = useFieldArray({
    control,
    name: "categories"
  });

  const watchedCategories = useWatch({
      control,
      name: "categories"
  });

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setValue('name', newName, { shouldValidate: true });
    
    // Auto-fill slug if it's empty or seems automatically generated
    const currentSlug = watch('slug');
    if (!currentSlug || currentSlug === nameValue?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')) {
       const slug = newName
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dashes
        .replace(/(^-|-$)+/g, ''); // Trim dashes
        
       setValue('slug', slug, { shouldValidate: true });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* SECCIÓN 1: DATOS BASE */}
      <div>
        <h2 className="text-xl font-semibold mb-1">Información Base del Serial</h2>
        <p className="text-sm text-muted-foreground mb-6">Esta información será pública en la Landing Page del campeonato y la portada se heredará a las etapas.</p>
        
        {/* FIX HU5: Herencia de Portada (Hero Image) */}
        <div className="mb-8">
            <FormField
                control={control}
                name="heroImageUrl"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel><RequiredLabel>Foto de Portada del Campeonato</RequiredLabel></FormLabel>
                        <FormControl>
                            <ImageUpload
                                initialImageUrl={field.value || undefined}
                                onUploadSuccess={(url) => field.onChange(url)}
                                storagePath="serials"
                            />
                        </FormControl>
                        <FormDescription>Esta imagen será la portada del campeonato y de todas sus etapas por defecto (ratio recomendado 16:9).</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <FormField
            control={control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel><RequiredLabel>Nombre del Campeonato</RequiredLabel></FormLabel>
                <FormControl>
                    <Input placeholder="Ej. Serial Nacional de Enduro 2026" {...field} onChange={(e) => { field.onChange(e); handleNameChange(e); }} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />

            <FormField
            control={control}
            name="slug"
            render={({ field }) => (
                <FormItem>
                <FormLabel><RequiredLabel>URL Amigable (Slug)</RequiredLabel></FormLabel>
                <FormControl>
                    <Input placeholder="serial-nacional-enduro" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormDescription>biciregistro.mx/serial/{field.value || 'tu-campeonato'}</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
            control={control}
            name="description"
            render={({ field }) => (
            <FormItem className="mb-6">
                <FormLabel><RequiredLabel>Descripción y Reglas Generales</RequiredLabel></FormLabel>
                <FormControl>
                <Textarea 
                    placeholder="Describe de qué trata el campeonato, qué lo hace especial y un resumen de las reglas..." 
                    className="min-h-[120px]"
                    {...field}
                    value={field.value ?? ''} 
                />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={control}
                name="state"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel><RequiredLabel>Estado Base</RequiredLabel></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona el estado" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {MEXICAN_STATES.map((state: string) => (
                                    <SelectItem key={state} value={state}>
                                        {state}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
            control={control}
            name="guideUrl"
            render={({ field }) => (
                <FormItem>
                <FormLabel>URL de Guía Técnica / Reglamento (Opcional)</FormLabel>
                <FormControl>
                    <Input placeholder="https://drive.google.com/..." {...field} value={field.value ?? ''} />
                </FormControl>
                <FormDescription>Link a un PDF con el reglamento oficial para que los corredores lo descarguen.</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
      </div>

      {/* SECCIÓN 2: ESTRUCTURA GLOBAL (CATEGORÍAS Y MODALIDAD) */}
      <div className="pt-6 border-t">
        <h2 className="text-xl font-semibold mb-1">Estructura Competitiva Global</h2>
        <p className="text-sm text-muted-foreground mb-6">Esta configuración se heredará a todas las etapas de manera idéntica para permitir el cálculo del Leaderboard.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <FormField
                control={control}
                name="modality"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel><RequiredLabel>Modalidad</RequiredLabel></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una modalidad" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {modalityOptions.map((mod) => (
                                    <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="level"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nivel de Dificultad</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un nivel" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {levels.map((l) => (
                                    <SelectItem key={l} value={l}>{l}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        {/* Categories Manager (Cloned from Event Configuration Section) */}
        <div className="space-y-4 border rounded-lg p-4 bg-muted/5 mt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Configuración de Categorías</h3>
                    <p className="text-sm text-muted-foreground">¿El campeonato se divide por categorías (ej. Elite, Master)?</p>
                </div>
            </div>

            <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                
                {/* WARNING LABEL FOR CATEGORY NAMES */}
                <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900 mb-4">
                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <AlertDescription className="text-yellow-700 dark:text-yellow-300 text-xs">
                        <strong>Importante:</strong> Asegúrate que los nombres de las categorías que ingresas aquí coincidan exactamente con los nombres de las categorías dadas de alta en tu sistema de cronometraje oficial.
                    </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between">
                    <FormLabel>Lista de Categorías</FormLabel>
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => appendCategory({ 
                            id: uuidv4(), 
                            name: '', 
                            description: '',
                            ageConfig: { isRestricted: false }, 
                            startTime: ''
                        })}
                    >
                        <PlusCircle className="mr-2 h-3 w-3" /> Agregar Categoría
                    </Button>
                </div>
                
                {categoryFields.map((field, index) => {
                    const isAgeRestricted = watchedCategories?.[index]?.ageConfig?.isRestricted;
                    
                    return (
                        <Card key={field.id} className="overflow-hidden bg-white">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex justify-between items-center border-b pb-2 mb-2">
                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px]">
                                            {index + 1}
                                        </span>
                                        Categoría
                                    </h4>
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeCategory(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Name and Additional Info */}
                                    <div className="space-y-4">
                                        <FormField
                                            control={control}
                                            name={`categories.${index}.name`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs"><RequiredLabel>Nombre de Categoría</RequiredLabel></FormLabel>
                                                    <FormControl><Input placeholder="Ej. Elite Varonil" {...field} value={field.value ?? ''} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={control}
                                            name={`categories.${index}.description`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Información Adicional</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ej. Requisitos especiales, equipo, etc." {...field} value={field.value ?? ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Age and Time Config */}
                                    <div className="space-y-4 bg-muted/30 p-3 rounded-md border border-dashed">
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="text-xs font-semibold">Restricción de Edad</FormLabel>
                                            <FormField
                                                control={control}
                                                name={`categories.${index}.ageConfig.isRestricted`}
                                                render={({ field }) => (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-muted-foreground">{field.value ? "Activada" : "N/A (Libre)"}</span>
                                                        <Switch 
                                                            className="scale-75 origin-right"
                                                            checked={field.value} 
                                                            onCheckedChange={field.onChange} 
                                                        />
                                                    </div>
                                                )}
                                            />
                                        </div>

                                        {isAgeRestricted ? (
                                            <div className="grid grid-cols-2 gap-3 animate-in zoom-in-95 duration-200">
                                                <FormField
                                                    control={control}
                                                    name={`categories.${index}.ageConfig.minAge`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px]">Edad Mín.</FormLabel>
                                                            <FormControl>
                                                                <Input 
                                                                    type="number" 
                                                                    min="0" 
                                                                    {...field} 
                                                                    value={field.value ?? ''} 
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={control}
                                                    name={`categories.${index}.ageConfig.maxAge`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px]">Edad Máx.</FormLabel>
                                                            <FormControl>
                                                                <Input 
                                                                    type="number" 
                                                                    min="0" 
                                                                    {...field} 
                                                                    value={field.value ?? ''} 
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-muted-foreground italic">Cualquier persona puede inscribirse sin importar su edad.</p>
                                        )}

                                        <div className="pt-2 border-t border-muted-foreground/10">
                                            <FormField
                                                control={control}
                                                name={`categories.${index}.startTime`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs flex items-center gap-1">
                                                            <Clock className="h-3 w-3" /> Horario de Salida
                                                        </FormLabel>
                                                        <div className="flex gap-2 items-center">
                                                            <FormControl className="flex-1">
                                                                <Input 
                                                                    type="time" 
                                                                    className={cn(!field.value && "text-muted-foreground opacity-60")}
                                                                    {...field} 
                                                                    value={field.value ?? ''}
                                                                />
                                                            </FormControl>
                                                            {!field.value && (
                                                                <span className="text-[10px] bg-muted px-2 py-1 rounded border">N/A</span>
                                                            )}
                                                        </div>
                                                        <FormDescription className="text-[10px]">Dejar vacío si no hay horario específico.</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
                
                {categoryFields.length === 0 && (
                    <p className="text-sm text-destructive text-center py-4">
                        Debes agregar al menos una categoría global para el campeonato.
                    </p>
                )}
                
                {formState.errors.categories && !Array.isArray(formState.errors.categories) && (
                    <p className="text-sm font-medium text-destructive">
                        {formState.errors.categories.message as string}
                    </p>
                )}
            </div>
        </div>
      </div>

      {/* SECCIÓN 3: REGLAS DE NEGOCIO Y LÍMITES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
        <FormField
            control={control}
            name="maxParticipantsGlobal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cupo Máximo Global (Opcional)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Ej. 300" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormDescription>Limita la cantidad de números de placa (Bibs) únicos a generar en todo el serial.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
        />

        <FormField
            control={control}
            name="requiresAffiliationId"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-white">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Requerir Afiliación</FormLabel>
                  <FormDescription>
                    Pide el número de licencia/federación al corredor.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
        />
      </div>
    </div>
  );
}
