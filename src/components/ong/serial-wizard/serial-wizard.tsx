'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { createSerialWithStagesAction } from '@/lib/actions/serial-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, ArrowLeft, Trophy, CheckCircle2, CalendarPlus, ExternalLink } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

import { StepSerialGeneralInfo } from './step-serial-general-info';
import { StepSerialStagesStructure } from './step-serial-stages-structure';
import { StepConfirmation } from './step-confirmation';

// Esquema para las categorías
// Fix RCA: Preprocesamiento de datos para Inputs HTML (Type Coercion)
const categorySchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "El nombre es obligatorio"),
    description: z.string().optional(),
    ageConfig: z.object({
        isRestricted: z.boolean(),
        minAge: z.preprocess(
            (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
            z.number().optional()
        ),
        maxAge: z.preprocess(
            (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
            z.number().optional()
        )
    }).optional(),
    startTime: z.string().optional()
});

const serialStagesSchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
  price: z.coerce.number().min(0, "El precio debe ser válido"),
});

const formSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  slug: z.string().min(3, 'El slug es obligatorio').regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  description: z.string().min(10, 'La descripción es muy corta'),
  country: z.string().min(2, 'País requerido'),
  state: z.string().min(2, 'Estado requerido'),
  guideUrl: z.string().url('Debe ser una URL válida (ej. Google Drive)').optional().or(z.literal('')),
  
  heroImageUrl: z.string().min(1, "La foto de portada es obligatoria"), // Añadido campo obligatorio para la portada
  modality: z.string().min(2, "Selecciona una modalidad base"),
  level: z.enum(['Principiante', 'Intermedio', 'Avanzado']).default('Intermedio'),
  categories: z.array(categorySchema).min(1, "Debes configurar al menos 1 categoría global"),
  
  maxParticipantsGlobal: z.coerce.number().min(0).optional(),
  requiresAffiliationId: z.boolean().default(false),
  stages: z.array(serialStagesSchema).min(1, 'Debe configurar al menos 1 etapa'),
});

export type FormValues = z.infer<typeof formSchema>;

const steps = [
  { id: 1, title: 'Información General' },
  { id: 2, title: 'Estructura y Fechas' },
  { id: 3, title: 'Confirmación' },
];

export function SerialWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [createdSlug, setCreatedSlug] = useState('');
  const [createdSerialId, setCreatedSerialId] = useState(''); // Estado para guardar el serialId real devuelto
  
  const router = useRouter();
  const { toast } = useToast();

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      country: 'México',
      state: '',
      guideUrl: '',
      heroImageUrl: '', // Valor inicial para el Hero Image
      modality: '',
      level: 'Intermedio',
      categories: [{ id: uuidv4(), name: 'General', ageConfig: { isRestricted: false } }], // Cat por defecto
      requiresAffiliationId: false,
      maxParticipantsGlobal: 0,
      stages: [{ date: '', price: 0 }],
    },
    mode: 'onChange',
  });

  const { trigger, getValues } = methods;

  const handleNext = async () => {
    let fieldsToValidate: any[] = [];
    
    if (currentStep === 1) {
      fieldsToValidate = ['name', 'slug', 'description', 'country', 'state', 'guideUrl', 'heroImageUrl', 'requiresAffiliationId', 'maxParticipantsGlobal', 'modality', 'level', 'categories'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['stages'];
    }

    const isValid = await trigger(fieldsToValidate as any);
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Submit Manual (Controlado por el botón explícito)
  const submitWizard = async () => {
    // Ultima validación de seguridad
    const isValid = await trigger();
    if (!isValid) return;

    setIsSubmitting(true);
    const data = getValues();
    
    // --- SANITIZACIÓN DE ZOD (Limpiador Defensivo) ---
    // 1. Limpiamos las categorías (minAge y maxAge) ya procesadas pero por si acaso.
    const sanitizedCategories = data.categories.map(cat => ({
        ...cat,
        ageConfig: cat.ageConfig ? {
            ...cat.ageConfig,
            minAge: cat.ageConfig.minAge,
            maxAge: cat.ageConfig.maxAge,
        } : undefined
    }));

    // 2. Construimos el Payload final, limpiando también maxParticipantsGlobal
    const payload = {
        ...data,
        categories: sanitizedCategories,
        maxParticipantsGlobal: (data.maxParticipantsGlobal === 0 || data.maxParticipantsGlobal === '' as any) 
            ? undefined 
            : data.maxParticipantsGlobal
    };

    const result = await createSerialWithStagesAction(payload);
    
    setIsSubmitting(false);

    if (result.success && result.serialId) {
      toast({
        title: '¡Campeonato Creado!',
        description: 'El serial y todas sus etapas han sido configurados con éxito.',
        variant: 'default',
      });
      // Mutamos el estado para que la pantalla de confirmación cambie a la de Éxito
      setCreatedSlug(data.slug);
      setCreatedSerialId(result.serialId); // Fix HU: Guardamos el ID real para la redirección
      setIsCreated(true);
      router.refresh();
    } else {
      console.error("Zod/Backend Error Details:", result.details); 
      toast({
        title: 'Error de Creación',
        description: result.error || 'Ocurrió un error inesperado al procesar los datos.',
        variant: 'destructive',
      });
    }
  };

  // Prevenir sumisión accidental al presionar Enter en los inputs de texto
  const preventEnterSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
      const target = e.target as HTMLElement;
      if (e.key === 'Enter' && target.tagName !== 'TEXTAREA' && target.tagName !== 'BUTTON') {
          e.preventDefault();
      }
  };

  return (
    <div className="w-full">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-muted z-0"></div>
          <div 
            className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 z-0 transition-all duration-300 ease-in-out" 
            style={{ 
                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
                backgroundColor: isCreated ? '#22c55e' : 'hsl(var(--primary))' // Green if created
            }}
          ></div>
          
          {steps.map((step) => (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors duration-300 ${
                isCreated
                  ? 'bg-green-500 border-green-500 text-white'
                  : currentStep >= step.id 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'bg-background border-muted text-muted-foreground'
              }`}>
                {isCreated || currentStep > step.id ? <CheckCircle2 className="w-6 h-6" /> : step.id}
              </div>
              <span className={`mt-2 text-xs font-medium hidden sm:block ${
                  isCreated ? 'text-green-600' : currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <FormProvider {...methods}>
        {/* RCA Fix: Usar un contenedor div en la vista de éxito para no anidar botones type='submit' dentro de la tag form */}
        {!isCreated ? (
        <form onKeyDown={preventEnterSubmit} className="space-y-6">
          <div className="min-h-[400px]">
             {currentStep === 1 && <StepSerialGeneralInfo />}
             {currentStep === 2 && <StepSerialStagesStructure />}
             {currentStep === 3 && <StepConfirmation />}
          </div>

          <div className="flex justify-between pt-6 border-t mt-8">
                <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrev}
                    disabled={currentStep === 1 || isSubmitting}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Regresar
                </Button>
                
                {currentStep < steps.length ? (
                    <Button type="button" onClick={handleNext}>
                        Continuar
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                ) : (
                    <Button 
                        type="button" // Ya no es submit
                        onClick={submitWizard} // Dispara la función manualmente
                        disabled={isSubmitting} 
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creando Campeonato...
                        </>
                        ) : (
                        <>
                            <Trophy className="w-4 h-4 mr-2" />
                            Crear Campeonato
                        </>
                        )}
                    </Button>
                )}
            </div>
        </form>
        ) : (
            // Pantalla de Éxito Controlada: Separada de la tag <form> para evitar que los botones disparen sumisiones indeseadas
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">¡Campeonato Creado con Éxito!</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Tus eventos han sido generados en borrador y la página pública ya está disponible.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
                    {/* Fix HU: URLs Relativas y enlace directo al Serial creado */}
                    <Link href={`/serial/${createdSlug}`} target="_blank" className="w-full sm:w-auto">
                        <Button type="button" variant="outline" className="w-full">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Ver Landing Pública
                        </Button>
                    </Link>
                    <Button 
                        type="button"
                        className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={() => router.push(`/dashboard/ong/serials/${createdSerialId}?tab=stages`)}
                    >
                        <CalendarPlus className="w-4 h-4 mr-2" />
                        Ir a Gestionar Etapas
                    </Button>
                </div>
            </div>
        )}
      </FormProvider>
    </div>
  );
}
