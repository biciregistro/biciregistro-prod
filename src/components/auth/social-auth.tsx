'use client';

import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirebaseServices, googleProvider } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { syncSocialUser } from '@/lib/actions/auth-actions';
import Link from 'next/link';

interface SocialAuthButtonsProps {
    callbackUrl?: string | null;
    mode?: 'login' | 'signup';
}

export function SocialAuthButtons({ callbackUrl, mode = 'login' }: SocialAuthButtonsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const { auth } = await getFirebaseServices();
            const result = await signInWithPopup(auth, googleProvider);
            
            // Get ID Token to create session
            const idToken = await result.user.getIdToken();
            
            // 1. Sync user with Firestore (ensures profile exists)
            const syncResult = await syncSocialUser();
            
            if (!syncResult.success) {
                throw new Error(syncResult.error || 'Error al sincronizar perfil.');
            }

            // 2. Create server session
            const response = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });

            if (!response.ok) {
                throw new Error('Falló la creación de la sesión.');
            }

            const sessionData = await response.json();
            
            toast({ 
                title: "¡Bienvenido!", 
                description: syncResult.isNewUser 
                    ? "Cuenta creada con Google. Completa tu perfil para ganar puntos." 
                    : "Sesión iniciada correctamente." 
            });

            // Redirect logic
            let targetUrl = '/dashboard';
            if (callbackUrl) {
                targetUrl = callbackUrl;
            } else if (syncResult.isNewUser) {
                targetUrl = '/dashboard/profile';
            } else if (sessionData.isAdmin) {
                targetUrl = '/admin';
            } else if (sessionData.isOng) {
                targetUrl = '/dashboard/ong';
            }

            window.location.href = targetUrl;

        } catch (error: any) {
            console.error("Google Auth Error:", error);
            
            if (error.code === 'auth/popup-closed-by-user') {
                toast({ title: "Acción cancelada", description: "Cerraste la ventana de Google." });
            } else {
                toast({ 
                    variant: "destructive", 
                    title: "Error de autenticación", 
                    description: error.message || "No se pudo iniciar sesión con Google." 
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-3 w-full">
            <Button 
                variant="outline" 
                type="button" 
                disabled={isLoading} 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 h-12 bg-white hover:bg-gray-50 text-gray-700 border-gray-300 font-medium shadow-sm"
            >
                {isLoading ? (
                    <span className="animate-spin">⏳</span>
                ) : (
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.73 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                )}
                {mode === 'signup' ? 'Regístrate con Google' : 'Continuar con Google'}
            </Button>
            
            {mode === 'signup' && (
                <p className="text-xs text-center text-muted-foreground mt-2 px-4">
                    Al registrarte con Google, confirmas que has leído y aceptas nuestros <Link href="/terms" target="_blank" className="underline hover:text-primary">Términos y Condiciones</Link> y el <Link href="/privacy" target="_blank" className="underline hover:text-primary">Aviso de Privacidad</Link>.
                </p>
            )}
        </div>
    );
}
