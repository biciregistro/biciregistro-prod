'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/client';
import { Eye, EyeOff } from 'lucide-react';

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Logo } from './icons/logo';

export function LoginForm() {
    const router = useRouter();
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!auth) {
            setError("Firebase Auth no está inicializado.");
            setIsLoading(false);
            return;
        }

        try {
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

            toast({ title: "¡Éxito!", description: "Has iniciado sesión correctamente." });
            router.push('/dashboard');

        } catch (error: any) {
            console.error("Login failed:", error);
            const errorMessage = error.code === 'auth/invalid-credential'
                ? 'Credenciales no válidas. Por favor, revisa tu correo y contraseña.'
                : error.message || 'Ocurrió un error inesperado.';
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
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertTitle>Error de Autenticación</AlertTitle>
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
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pr-10" // Add padding to make space for the icon
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
            <CardFooter className="text-center text-sm">
                <p>¿No tienes una cuenta? <Link href="/signup" className="underline">Regístrate</Link></p>
            </CardFooter>
        </Card>
    );
}
