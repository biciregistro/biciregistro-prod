import { Check, Clock, CreditCard, Banknote, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InsuranceStatus } from '@/lib/types';

interface InsuranceStepperProps {
  status: InsuranceStatus | undefined;
  hasPolicyUrl: boolean;
}

export function InsuranceStepper({ status, hasPolicyUrl }: InsuranceStepperProps) {
  // Mapeo de estados a pasos numéricos (1-5)
  // 1: Cotizando (PENDING)
  // 2: Cotización Lista (QUOTED)
  // 3: Pendiente de pago (APPROVED, PAYMENT_LINK_SENT)
  // 4: Pagado (PAID sin póliza)
  // 5: Completado (PAID con póliza)
  
  const getCurrentStep = () => {
    if (status === 'PENDING') return 1;
    if (status === 'QUOTED') return 2;
    if (status === 'APPROVED' || status === 'PAYMENT_LINK_SENT') return 3;
    if (status === 'PAID') {
      return hasPolicyUrl ? 5 : 4;
    }
    return 0; // REJECTED, CLOSED, o null
  };

  const currentStep = getCurrentStep();

  if (currentStep === 0) return null;

  const steps = [
    { step: 1, label: 'Cotizando', icon: Clock, description: 'Tu solicitud está en revisión' },
    { step: 2, label: 'Lista', icon: Check, description: 'Revisa tu cotización' },
    { step: 3, label: 'Pago', icon: CreditCard, description: 'Realiza el pago' },
    { step: 4, label: 'Pagado', icon: Banknote, description: 'Sube tu póliza' },
    { step: 5, label: 'Lista', icon: Sparkles, description: '¡Bici protegida!' },
  ];

  return (
    <div className="w-full py-4 px-2">
      {/* Barra de progreso visual */}
      <div className="relative flex items-center justify-between mb-2 px-4">
        {/* Línea de fondo */}
        <div className="absolute left-4 right-4 top-4 h-0.5 bg-gray-200 dark:bg-gray-700 -z-0" />
        
        {/* Línea de progreso coloreada */}
        <div 
          className="absolute left-4 top-4 h-0.5 bg-blue-600 dark:bg-blue-400 transition-all duration-500 ease-in-out -z-0"
          style={{ width: `calc(${((currentStep - 1) / (steps.length - 1)) * 100}% - 8px)` }}
        />

        {steps.map((s) => {
          const isActive = s.step === currentStep;
          const isCompleted = s.step < currentStep;
          const Icon = s.icon;

          return (
            <div key={s.step} className="flex flex-col items-center group relative z-10">
              <div 
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 bg-white dark:bg-slate-900",
                  isActive && "border-blue-600 bg-blue-600 text-white scale-110 shadow-lg shadow-blue-500/30",
                  isCompleted && "border-blue-600 bg-blue-600 text-white",
                  !isActive && !isCompleted && "border-gray-300 text-gray-400 dark:border-gray-600"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive && "animate-pulse")} />
              </div>
              
              <span className={cn(
                "absolute top-10 text-[10px] font-medium transition-colors duration-300 whitespace-nowrap hidden sm:block",
                (isActive || isCompleted) ? "text-blue-700 dark:text-blue-300" : "text-gray-400"
              )}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Texto descriptivo del paso actual */}
      <div className="text-center mt-6 sm:mt-4">
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
          Paso {currentStep} de 5
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            {steps[currentStep - 1]?.description}
        </p>
      </div>
    </div>
  );
}
