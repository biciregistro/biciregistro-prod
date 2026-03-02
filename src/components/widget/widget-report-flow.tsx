'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { ProfileForm } from '@/components/user-components';
import { SimpleBikeForm } from '@/components/widget/simple-bike-form';
import { TheftReportForm } from '@/components/bike-components/theft-report-form';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Bike, AlertTriangle, LogOut, ArrowRight, Sparkles } from 'lucide-react';
import { Bike as BikeType } from '@/lib/types';
import { Logo } from '@/components/icons/logo';

function WidgetReportFlowContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialStep = searchParams.get('step') as 'auth' | 'register-bike' | 'report-theft' | 'success' | null;
    
    const [step, setStep] = useState<'auth' | 'register-bike' | 'report-theft' | 'success'>('auth');
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [registeredBike, setRegisteredBike] = useState<BikeType | null>(null);

    // Sincronizar paso inicial desde URL si existe
    useEffect(() => {
        if (initialStep) {
            setStep(initialStep);
        }
    }, [initialStep]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
            
            // Si el usuario se loguea y estábamos en auth, avanzar
            if (firebaseUser) {
                if (step === 'auth') {
                     setStep('register-bike');
                }
            } else {
                // Si no hay usuario y no estamos en auth, volver a auth
                if (step !== 'auth') {
                    setStep('auth');
                }
            }
        });
        return () => unsubscribe();
    }, [step]);

    // --- Lógica de Redirección Automática ---
    useEffect(() => {
        if (step === 'success' && user) {
            const timer = setTimeout(() => {
                handleSuccessRedirect();
            }, 5000); // 5 segundos para que lean el mensaje de éxito
            return () => clearTimeout(timer);
        }
    }, [step, user]);

    const handleBikeRegistered = async () => {
        try {
            // Obtener la bici más reciente del usuario
            const res = await fetch('/api/user-bikes');
            if (!res.ok) throw new Error("Error fetching bikes");
            
            const bikes = await res.json();
            if (bikes && bikes.length > 0) {
                // Asumimos que la primera es la más reciente por el sort del backend
                setRegisteredBike(bikes[0]);
                setStep('report-theft');
            }
        } catch (error) {
            console.error("Error recuperando la bici registrada:", error);
        }
    };

    const handleSuccessRedirect = () => {
        // Detectamos si es usuario nuevo: registrado hace menos de 5 minutos
        let isNewUser = false;
        if (user?.metadata?.creationTime) {
            const creation = new Date(user.metadata.creationTime).getTime();
            const now = Date.now();
            if (Math.abs(now - creation) < 300000) { // 5 minutos de margen
                isNewUser = true;
            }
        }

        const targetUrl = isNewUser ? '/dashboard/profile' : '/dashboard';

        if (typeof window !== 'undefined') {
            if (window.opener) {
                try {
                    window.opener.location.href = targetUrl;
                    window.close();
                } catch (e) {
                    // Si el opener está bloqueado o cerrado, redirigir aquí mismo
                    router.push(targetUrl);
                }
            } else {
                router.push(targetUrl);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-6 text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-gray-600 font-medium">Verificando sesión...</p>
            </div>
        );
    }

    // Paso 1: Autenticación
    if (step === 'auth' && !user) {
        return (
            <div className="p-4 max-w-md mx-auto">
                <div className="flex justify-center mb-4">
                    <Logo />
                </div>
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold text-primary tracking-tight">Reporte de Robo Express</h1>
                    <p className="text-sm text-gray-500 mt-1">Crea una cuenta o inicia sesión para activar la alerta.</p>
                </div>
                {/* Usamos ProfileForm con el callbackUrl correcto */}
                <ProfileForm callbackUrl={`${window.location.pathname}?step=register-bike`} />
            </div>
        );
    }

    // Paso 2: Registro de Bici (Si ya tiene sesión)
    if (step === 'register-bike') {
        return (
            <div className="p-4 max-w-md mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="truncate max-w-[120px]">{user?.email}</span>
                    </div>
                    <button 
                        onClick={() => signOut(auth)} 
                        className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                        title="Cerrar sesión"
                    >
                        <LogOut className="w-3 h-3" /> Salir
                    </button>
                </div>

                <div className="mb-6 text-center">
                    <h1 className="text-xl font-bold flex items-center justify-center gap-2 text-gray-800">
                        <Bike className="text-primary w-6 h-6" /> Registrar Bicicleta
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Ingresa los datos de la bicicleta robada.</p>
                </div>
                
                <SimpleBikeForm onSuccess={handleBikeRegistered} />
                
                <div className="mt-8 pt-4 border-t text-center">
                     <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-2">¿Ya estaba registrada?</p>
                     <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs h-9"
                        onClick={handleBikeRegistered}
                    >
                        Usar mi última bicicleta registrada
                    </Button>
                </div>
            </div>
        );
    }

    // Paso 3: Detalles del Robo
    if (step === 'report-theft' && registeredBike) {
        return (
            <div className="p-4 max-w-md mx-auto">
                 <div className="mb-6 text-center">
                    <h1 className="text-xl font-bold flex items-center justify-center gap-2 text-red-600">
                        <AlertTriangle className="w-6 h-6" /> Detalles del Robo
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Reportando: <span className="font-semibold text-gray-800">{registeredBike.make} {registeredBike.model}</span>
                    </p>
                </div>
                <TheftReportForm 
                    bike={registeredBike} 
                    onSuccess={() => setStep('success')} 
                    defaultOpen={true}
                />
            </div>
        );
    }

    // Paso 4: Éxito con Redirección Automática (UX Mejorada)
    if (step === 'success') {
        const isNewUser = user?.metadata?.creationTime && (Math.abs(Date.now() - new Date(user.metadata.creationTime).getTime()) < 300000);

        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center space-y-8 animate-in zoom-in-95 duration-700 max-w-md mx-auto">
                <div className="relative">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center shadow-inner">
                        <CheckCircle2 className="w-14 h-14 text-green-600" />
                    </div>
                    <Sparkles className="absolute -top-1 -right-1 w-8 h-8 text-yellow-500 animate-pulse" />
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">¡Alerta Activada!</h1>
                    <p className="text-gray-600 text-lg leading-relaxed">
                        Tu reporte ha sido enviado. La comunidad de BiciRegistro ya está atenta.
                    </p>
                </div>

                <div className="w-full bg-blue-50/80 border border-blue-100 rounded-2xl p-6 space-y-4 shadow-sm backdrop-blur-sm">
                    <div className="flex items-center justify-center gap-3 text-blue-800 font-bold">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span>{isNewUser ? 'Redirigiendo a tu perfil...' : 'Redirigiendo al garaje...'}</span>
                    </div>
                    <p className="text-sm text-blue-700/80 leading-relaxed font-medium">
                        {isNewUser 
                            ? "Por favor, completa tu información de contacto. Es vital para que podamos avisarte si alguien localiza tu bicicleta."
                            : "Estamos preparando tu acceso seguro. Por favor, no cierres esta ventana."
                        }
                    </p>
                    {/* Barra de progreso con estilo inline para asegurar animación sin depender de CSS externo */}
                    <div className="w-full bg-blue-200/50 h-2 rounded-full overflow-hidden">
                        <div 
                            className="bg-blue-600 h-full transition-all ease-linear"
                            style={{
                                width: '100%',
                                animation: 'progress-loading 5s linear'
                            }}
                        />
                    </div>
                    <style jsx>{`
                        @keyframes progress-loading {
                            0% { width: 0%; }
                            100% { width: 100%; }
                        }
                    `}</style>
                </div>

                <div className="flex flex-col gap-3 w-full">
                    <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-gray-400 hover:text-primary text-xs flex items-center justify-center gap-2 group"
                        onClick={handleSuccessRedirect}
                    >
                        Si no eres redirigido, haz clic aquí <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}

export function WidgetReportFlow() {
    return (
        <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>}>
            <WidgetReportFlowContent />
        </Suspense>
    );
}
