'use client';

import { useRouter } from 'next/navigation';
import { SimpleBikeForm } from '@/components/widget/simple-bike-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { useGamificationToast } from '@/hooks/use-gamification-toast';

export function OngOnboardingClient() {
  const router = useRouter();
  const { showRewardToast } = useGamificationToast();

  const handleSuccess = (bikeData: any, pointsAwarded?: number) => {
    // Al registrar con éxito la bicicleta:
    // 1. Otorga puntos visuales mediante el toast usando los puntos reales del backend
    if (pointsAwarded && pointsAwarded > 0) {
      showRewardToast(pointsAwarded, "¡Bicicleta registrada! Has ganado kilómetros.");
    } else {
      // Fallback visual por si algo falló (aunque el backend ya se encargó de asignarlos si correspondía)
      showRewardToast(50, "¡Bicicleta registrada! Has ganado kilómetros.");
    }
    
    // 2. Redirige al perfil para completar datos médicos/personales
    router.push('/dashboard/profile?onboarding=true');
  };

  return (
    <Card className="border-0 md:border-2 border-primary/10 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-slate-950 p-6 md:p-8 text-center border-b border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck className="w-32 h-32 text-primary" />
            </div>
            <div className="relative z-10">
                <div className="bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/30 shadow-inner">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl md:text-3xl font-black text-white tracking-tight italic uppercase">
                    Protege tu Bicicleta
                </CardTitle>
                <CardDescription className="text-white/80 text-sm md:text-base mt-2 font-medium">
                    Ingresa los datos de tu bicicleta para vincularla a tu cuenta y blindar tu patrimonio.
                </CardDescription>
            </div>
        </div>
        <CardContent className="pt-8 px-4 md:px-8">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg mb-6 text-sm">
                Asegúrate de ingresar el <strong>Número de Serie</strong> correctamente. Es la única forma legal de demostrar tu propiedad en caso de robo.
            </div>
            
            <SimpleBikeForm onSuccess={handleSuccess} />
        </CardContent>
    </Card>
  );
}
