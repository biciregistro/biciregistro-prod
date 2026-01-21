'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { ProfileForm } from '@/components/user-components';
import { SimpleBikeForm } from '@/components/widget/simple-bike-form';
import { TheftReportForm } from '@/components/bike-components/theft-report-form';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Bike, AlertTriangle, LogOut } from 'lucide-react';
import { Bike as BikeType } from '@/lib/types';
import { Logo } from '@/components/icons/logo';

function WidgetReportFlowContent() {
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
            // Fallback manual o mensaje de error?
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
                    <h1 className="text-2xl font-bold text-primary">Reporte de Robo Express</h1>
                    <p className="text-sm text-gray-500">Crea una cuenta o inicia sesión para registrar tu reporte.</p>
                </div>
                {/* 
                    Usamos ProfileForm. 
                    El callbackUrl hará que al terminar el signup/login, se recargue esta misma página
                    pero con ?step=register-bike, lo que disparará el useEffect inicial.
                */}
                <ProfileForm callbackUrl="/widget/popup?step=register-bike" />
            </div>
        );
    }

    // Paso 2: Registro de Bici (Si ya tiene sesión)
    if (step === 'register-bike') {
        return (
            <div className="p-4 max-w-md mx-auto">
                <div className="flex justify-end mb-2">
                    <div className="text-xs text-gray-500 flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-full">
                        <span className="truncate max-w-[150px]">{user?.email}</span>
                        <button 
                            onClick={() => signOut(auth)} 
                            className="text-red-500 hover:text-red-700 flex items-center"
                            title="Cerrar sesión"
                        >
                            <LogOut className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div className="mb-6 text-center">
                    <h1 className="text-xl font-bold flex items-center justify-center gap-2">
                        <Bike className="text-primary w-6 h-6" /> Registrar Bicicleta
                    </h1>
                    <p className="text-sm text-gray-500">¿Qué bicicleta te robaron?</p>
                </div>
                
                <SimpleBikeForm onSuccess={handleBikeRegistered} />
                
                {/* Opción por si el usuario ya tenía bicis registradas y solo quiere reportar una */}
                <div className="mt-8 pt-4 border-t text-center">
                     <p className="text-xs text-gray-400 mb-2">¿Ya la tenías registrada?</p>
                     <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleBikeRegistered}
                    >
                        Seleccionar mi última bicicleta registrada
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
                    <p className="text-sm text-gray-500">
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

    // Paso 4: Éxito
    if (step === 'success') {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-8 text-center space-y-6 animate-in zoom-in-95 duration-500 max-w-md mx-auto">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900">¡Alerta Activada!</h1>
                    <p className="text-gray-600">
                        Tu reporte ha sido generado correctamente. La comunidad de BiciRegistro y nuestros aliados han sido notificados.
                    </p>
                </div>
                <div className="w-full space-y-3 pt-4">
                    <Button 
                        className="w-full h-12 text-lg shadow-lg bg-primary hover:bg-primary/90" 
                        onClick={() => {
                            if (window.opener) {
                                window.opener.location.href = '/dashboard';
                                window.close();
                            } else {
                                window.location.href = '/dashboard';
                            }
                        }}
                    >
                        Ir a mi Panel de Control
                    </Button>
                    <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.close()}
                    >
                        Cerrar Ventana
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}

export function WidgetReportFlow() {
    return (
        <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin"/></div>}>
            <WidgetReportFlowContent />
        </Suspense>
    );
}
