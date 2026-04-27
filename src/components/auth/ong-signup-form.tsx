'use client';

import { useActionState, useEffect, useState, useRef, useTransition } from 'react';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';

import type { ActionFormState } from '@/lib/types';
import { ongSignup } from '@/lib/actions/auth-actions';
import { useToast } from '@/hooks/use-toast';
import { auth, signInWithToken } from '@/lib/firebase/client';
import { SocialAuthButtons } from '@/components/auth/social-auth';

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { PasswordStrengthIndicator } from '@/components/user-components';

// Schema exclusivo para el representante de la ONG
const ongSignupSchema = z.object({
    name: z.string().min(2, "El nombre es obligatorio."),
    lastName: z.string().min(2, "Los apellidos son obligatorios."),
    email: z.string().email("El correo electrónico no es válido."),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
    confirmPassword: z.string(),
    termsAccepted: z.boolean().refine(val => val === true, {
        message: "Debes aceptar los Términos y Condiciones.",
    }),
}).refine(data => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
});

type FormValues = z.infer<typeof ongSignupSchema>;

function SubmitButton({ isSigningIn, loadingAuth, termsAccepted }: { isSigningIn?: boolean, loadingAuth?: boolean, termsAccepted?: boolean }) {
    const { pending } = useFormStatus();
    const isDisabled = pending || isSigningIn || loadingAuth || !termsAccepted;

    let text = 'Crear cuenta de Responsable';
    if (loadingAuth) text = 'Verificando...';
    if (isSigningIn) text = 'Finalizando...';
    if (pending) text = 'Creando...';

    return (
        <Button 
            type="submit" 
            disabled={isDisabled} 
            className="w-full h-12 text-lg font-bold shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
        >
            {isDisabled && !termsAccepted && !pending ? 'Acepta los términos' : text}
        </Button>
    );
}

export function OngSignupForm() {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const [isPending, startTransition] = useTransition();
    
    // Accion de servidor exclusiva
    const [state, formAction] = useActionState<ActionFormState, FormData>(ongSignup, null);
    
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const { toast } = useToast();
    
    const [showPassword, setShowPassword] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showManualForm, setShowManualForm] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setFirebaseUser(user);
            setLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);

    const form = useForm<FormValues>({
        resolver: zodResolver(ongSignupSchema),
        defaultValues: {
            name: "",
            lastName: "",
            email: "",
            password: "",
            confirmPassword: "",
            termsAccepted: false,
        },
        mode: 'onSubmit',
    });

    const passwordValue = form.watch("password");

    useEffect(() => {
        if (!state) return;

        if (state.success && state.customToken) {
            setIsSigningIn(true);
            const handleSignInAndSession = async () => {
                const { success, idToken, error: signInError } = await signInWithToken(state.customToken!);
                if (!success || !idToken) {
                    toast({ title: 'Error', description: signInError, variant: 'destructive' });
                    setIsSigningIn(false);
                    return;
                }
                try {
                    const response = await fetch('/api/auth/session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idToken }),
                    });
                    if (!response.ok) throw new Error('Falló sesión.');
                    
                    toast({ title: '¡Éxito!', description: 'Has creado tu cuenta de responsable. Ahora configuremos tu organización.' });
                    
                    // Force navigation to the NEW independent onboarding wizard route
                    window.location.href = '/ong-onboarding';

                } catch (sessionError) {
                    setIsSigningIn(false);
                    toast({ title: 'Error', description: 'No se pudo crear la sesión.', variant: 'destructive' });
                }
            };
            handleSignInAndSession();
            return;
        }

        if (state.errors) {
            const errorObj = state.errors as Record<string, string[]>;
            Object.keys(errorObj).forEach((key) => {
                const message = errorObj[key]?.[0];
                if (message) {
                    form.setError(key as any, { type: 'server', message });
                }
            });
            setShowManualForm(true);
            toast({
                variant: 'destructive',
                title: "Información Incompleta",
                description: "Por favor revisa los campos requeridos.",
            });
        } else if (state.error) {
            toast({ variant: 'destructive', title: "Error", description: state.error });
            setShowManualForm(true);
        }
    }, [state, toast, form]);

    const handleFormSubmit = async (values: FormValues) => {
        if (!termsAccepted) {
            toast({ title: "Atención", description: "Debes aceptar los Términos.", variant: "destructive" });
            return;
        }

        if (formRef.current) {
            const formData = new FormData(formRef.current);
            formData.set('termsAccepted', 'true');

            startTransition(() => {
                formAction(formData);
            });
        }
    };

    return (
        <div className="container max-w-lg py-12 px-4 md:px-0">
            <Form {...form}>
                <form 
                    ref={formRef}
                    onSubmit={form.handleSubmit(handleFormSubmit)} 
                    className="w-full flex flex-col"
                >
                    <Card className="border-2 border-primary/10 shadow-xl mb-6 overflow-hidden">
                        <div className="bg-slate-950 p-6 text-center border-b border-white/10">
                            <div className="flex justify-center mb-4">
                                <Link href="/" className="flex justify-center"><Logo /></Link>
                            </div>
                            <CardTitle className="text-2xl font-bold text-white">Únete como Organizador</CardTitle>
                            <CardDescription className="text-white/80 mt-1">Crea tu cuenta de responsable para empezar a publicar y gestionar eventos en la plataforma.</CardDescription>
                        </div>
                        
                        <CardContent className="px-6 pb-6 pt-6">
                            <div className="w-full">
                                {/* IMPORTANTE: Usamos el prop roleContext="ong" para que SocialAuthButtons asigne el rol correcto */}
                                <SocialAuthButtons mode="signup" roleContext="ong" />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-center mb-6">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            className="text-muted-foreground hover:text-foreground text-sm"
                            onClick={() => setShowManualForm(!showManualForm)}
                        >
                            ¿No tienes cuenta de Google? {showManualForm ? <ChevronUp className="ml-1 h-4 w-4"/> : <ChevronDown className="ml-1 h-4 w-4"/>}
                        </Button>
                    </div>

                    {showManualForm && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                            <Card className="shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-xl">Datos del Responsable</CardTitle>
                                    <CardDescription>Esta cuenta gestionará la organización. Más adelante configuraremos los datos de tu empresa u ONG.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 px-4 sm:px-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="name" render={({ field }) => (
                                            <FormItem><FormLabel>Nombre(s) del Responsable</FormLabel><FormControl><Input placeholder="Tu nombre personal" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="lastName" render={({ field }) => (
                                            <FormItem><FormLabel>Apellidos del Responsable</FormLabel><FormControl><Input placeholder="Tus apellidos" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel>Correo Electrónico (Login)</FormLabel><FormControl><Input type="email" placeholder="m@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                        <FormField control={form.control} name="password" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Contraseña</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input type={showPassword ? 'text' : 'password'} {...field} />
                                                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(prev => !prev)}>
                                                            {showPassword ? <EyeOff /> : <Eye />}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Repetir Contraseña</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input type={showPassword ? 'text' : 'password'} {...field} />
                                                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(prev => !prev)}>
                                                            {showPassword ? <EyeOff /> : <Eye />}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                    <PasswordStrengthIndicator password={passwordValue} />
                                    
                                    <div className="flex items-start space-x-2 pt-6 pb-2">
                                        <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => {
                                            setTermsAccepted(checked as boolean);
                                            form.setValue('termsAccepted', checked as boolean);
                                        }} />
                                        <div className="grid gap-1.5 leading-none">
                                            <label htmlFor="terms" className="text-sm font-medium leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground">
                                                He leído y acepto los <Link href="/terms" target="_blank" className="text-primary hover:underline font-semibold">Términos y Condiciones</Link> y el <Link href="/privacy" target="_blank" className="text-primary hover:underline font-semibold">Aviso de Privacidad</Link>
                                            </label>
                                        </div>
                                    </div>
                                    <FormField control={form.control} name="termsAccepted" render={({ field }) => (
                                         <FormItem className="hidden"><FormControl><Input {...field} value={field.value.toString()} /></FormControl><FormMessage /></FormItem>
                                    )} />

                                </CardContent>
                                <CardFooter className="flex-col gap-4 bg-muted/20 border-t pt-6">
                                    <div className="flex flex-col gap-4 w-full">
                                        <SubmitButton isSigningIn={isSigningIn} loadingAuth={loadingAuth} termsAccepted={termsAccepted} />
                                    </div>
                                </CardFooter>
                            </Card>
                        </div>
                    )}
                    
                     <div className="text-sm text-center text-muted-foreground mt-8">
                        ¿Ya tienes una cuenta de organizador? <Link href="/login" className="underline hover:text-primary font-semibold">Inicia Sesión</Link>
                    </div>
                </form>
            </Form>
        </div>
    );
}
