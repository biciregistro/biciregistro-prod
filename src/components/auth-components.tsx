'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode, type Auth } from 'firebase/auth';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseServices } from '@/lib/firebase/client';
import { Eye, EyeOff } from 'lucide-react';

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Logo } from './icons/logo';
import { PasswordStrengthIndicator } from './user-components';
import { SocialAuthButtons } from './auth/social-auth';

function LoginFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const callbackUrl = searchParams.get('callbackUrl');

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { auth } = await getFirebaseServices();
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const idToken = await userCredential.user.getIdToken();
            
            const response = await fetch('/api/auth/session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ idToken }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falló la creación de la sesión.');
            }
            
            const sessionData = await response.json();

            toast({ title: "¡Éxito!", description: "Has iniciado sesión correctamente." });

            // Robust redirect strategy: Use window.location.href to avoid Next.js router client-side transition hangs
            // caused by potential chunk loading errors or hydration mismatches.
            let targetUrl = '/dashboard';
            
            if (callbackUrl) {
                targetUrl = callbackUrl;
            } else if (sessionData.isAdmin) {
                targetUrl = '/admin';
            } else if (sessionData.isOng) {
                targetUrl = '/dashboard/ong';
            }
            
            // Force browser navigation
            window.location.href = targetUrl;

        } catch (error: any) {
            console.error("Login failed:", error);
            
            let errorMessage = 'Ocurrió un error inesperado. Por favor, intenta más tarde.';
            
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                errorMessage = 'Credenciales incorrectas. Verifica tu contraseña, o si vinculaste tu cuenta con Google, usa el botón "Continuar con Google".';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'No se encontró ninguna cuenta con este correo electrónico.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'El acceso ha sido temporalmente bloqueado debido a múltiples intentos fallidos. Intenta más tarde.';
            } else if (error.message) {
                 errorMessage = error.message;
            }

            setError(errorMessage);
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    <Link href="/"><Logo /></Link>
                </div>
                <CardTitle>Iniciar Sesión</CardTitle>
                <CardDescription>Ingresa a tu cuenta de BiciRegistro</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-6 w-full">
                    <SocialAuthButtons callbackUrl={callbackUrl} mode="login" />
                </div>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            O continuar con tu correo
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertTitle>Atención</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="m@example.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2 relative">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Contraseña</Label>
                            <Link href="/forgot-password" className="text-sm text-muted-foreground underline">
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                        <Input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-gray-500"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 text-center text-sm">
                <p>¿No tienes una cuenta? <Link href={callbackUrl ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/signup"} className="underline font-semibold text-primary">Regístrate gratis</Link></p>
                
                {callbackUrl && callbackUrl.includes('express-register') && (
                    <div className="mt-4 bg-primary/10 text-primary p-3 rounded-lg text-xs font-medium">
                        Tu valuación está guardada. Inicia sesión para blindar tu patrimonio.
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}

export function LoginForm() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <LoginFormContent />
        </Suspense>
    );
}

export function ForgotPasswordForm() {
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSent, setIsSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { auth } = await getFirebaseServices();
            const actionCodeSettings = {
                url: `${window.location.origin}/reset-password`,
                handleCodeInApp: true,
            };
            await sendPasswordResetEmail(auth, email, actionCodeSettings);
            setIsSent(true);
        } catch (error: any) {
            console.error("Password reset request failed:", error);
            setError("Si tu correo está en nuestra base de datos, recibirás un enlace. Si no, revisa tu carpeta de spam.");
        } finally {
            setIsLoading(false);
        }
    };
    
    if (isSent) {
        return (
             <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <Link href="/"><Logo /></Link>
                    </div>
                    <CardTitle>Revisa tu Correo</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center">Se han enviado las instrucciones a <strong>{email}</strong>. Por favor, revisa tu bandeja de entrada y spam.</p>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Link href="/login" className="underline">Volver a Iniciar Sesión</Link>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    <Link href="/"><Logo /></Link>
                </div>
                <CardTitle>Recuperar Contraseña</CardTitle>
                <CardDescription>Ingresa tu correo para recibir instrucciones</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                     {error && (
                        <Alert variant="destructive">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="tu@correo.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? 'Enviando...' : 'Enviar Instrucciones'}
                    </Button>
                </form>
            </CardContent>
             <CardFooter className="text-center text-sm">
                <p>¿Recordaste tu contraseña? <Link href="/login" className="underline">Inicia sesión</Link></p>
            </CardFooter>
        </Card>
    );
}

function ResetPasswordFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [authInstance, setAuthInstance] = useState<Auth | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const oobCode = searchParams.get('oobCode');

    const passwordChecks = useMemo(() => ({
        length: password.length >= 6,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$&*]/.test(password),
    }), [password]);

    const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

    useEffect(() => {
        const verifyCode = async () => {
            if (!oobCode) {
                setError("El código de restablecimiento no se encontró en la URL.");
                return;
            }
            try {
                const { auth } = await getFirebaseServices();
                setAuthInstance(auth); // Save auth instance for later use
                await verifyPasswordResetCode(auth, oobCode);
                setIsVerified(true);
            } catch (error) {
                console.error("Invalid password reset code:", error);
                setError("El enlace de restablecimiento es inválido o ha expirado. Por favor, solicita uno nuevo.");
            }
        };
        verifyCode();
    }, [oobCode]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }
        if (!isPasswordStrong) {
            setError("La contraseña no cumple con todos los criterios de seguridad.");
            return;
        }
        if (!oobCode || !authInstance) {
            setError("Falta el código de restablecimiento o la autenticación no está lista.");
            return;
        }
        
        setIsLoading(true);
        try {
            await confirmPasswordReset(authInstance, oobCode, password);
            toast({
                title: "¡Éxito!",
                description: "Tu contraseña ha sido actualizada. Ahora puedes iniciar sesión.",
            });
            router.push('/login');
        } catch (error: any) {
            console.error("Password reset failed:", error);
            setError("No se pudo restablecer la contraseña. El enlace puede haber expirado.");
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isVerified) {
         return (
             <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                     <div className="flex justify-center mb-4">
                        <Link href="/"><Logo /></Link>
                    </div>
                    <CardTitle>Verificando Enlace...</CardTitle>
                </CardHeader>
                <CardContent>
                    {error ? (
                         <Alert variant="destructive">
                            <AlertTitle>Error de Verificación</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : (
                        <p className="text-center">Estamos validando tu solicitud...</p>
                    )}
                </CardContent>
                  <CardFooter className="flex justify-center">
                    <Link href="/forgot-password"  className="underline">Solicitar un nuevo enlace</Link>
                </CardFooter>
            </Card>
         )
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                 <div className="flex justify-center mb-4">
                    <Link href="/"><Logo /></Link>
                </div>
                <CardTitle>Restablecer Contraseña</CardTitle>
                <CardDescription>Crea una nueva contraseña segura para tu cuenta.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-2 relative">
                        <Label htmlFor="password">Nueva Contraseña</Label>
                        <Input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                             className="pr-10"
                        />
                         <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-gray-500"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    
                    {password && <PasswordStrengthIndicator password={password} />}

                    <Button type="submit" disabled={isLoading || !isPasswordStrong || password !== confirmPassword} className="w-full">
                        {isLoading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export function ResetPasswordForm() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ResetPasswordFormContent />
        </Suspense>
    );
}
