'use client';

import { useActionState, useEffect, useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { User, ActionFormState } from '@/lib/types';
import { updateProfile, signup } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { countries, type Country } from '@/lib/countries';
import { userFormSchema } from '@/lib/schemas'; // <-- SINGLE UNIFIED SCHEMA
import { signInWithToken } from '@/lib/firebase/client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Logo } from './icons/logo';
import { cn } from '@/lib/utils';

type FormValues = z.infer<typeof userFormSchema>;

function SubmitButton({ isEditing, isSigningIn }: { isEditing?: boolean, isSigningIn?: boolean }) {
    const { pending } = useFormStatus();
    
    let text = isEditing ? 'Guardar Cambios' : 'Crear cuenta';
    if (isSigningIn) text = 'Finalizando...';

    let pendingText = isEditing ? 'Guardando...' : 'Creando...';
    if (isSigningIn) pendingText = 'Finalizando...';

    return <Button type="submit" disabled={pending || isSigningIn} className="w-full">{pending ? pendingText : text}</Button>;
}

function PasswordStrengthIndicator({ password = "" }: { password?: string }) {
    const checks = {
        length: password.length >= 6,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$&*]/.test(password),
    };

    const criteria = [
        { key: 'length', label: "Al menos 6 caracteres" },
        { key: 'uppercase', label: "Una letra mayúscula" },
        { key: 'number', label: "Un número" },
        { key: 'special', label: "Un carácter especial (!@#$&*)" },
    ];

    if (!password) return null;

    return (
        <div className="space-y-2 text-sm">
            {criteria.map(criterion => {
                const met = checks[criterion.key as keyof typeof checks];
                return (
                    <div key={criterion.key} className={cn("flex items-center gap-2", met ? "text-green-600" : "text-muted-foreground")}>
                        {met ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        <span>{criterion.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

export function ProfileForm({ user }: { user?: User }) {
    const router = useRouter();
    const isEditing = !!user;
    const action = isEditing ? updateProfile : signup;
    
    const [state, formAction] = useActionState<ActionFormState, FormData>(action, null);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const { toast } = useToast();
    const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(countries.find(c => c.name === (user?.country || 'México')));
    const [states, setStates] = useState<string[]>(selectedCountry?.states || []);
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            id: user?.id || undefined,
            name: user?.name || "",
            lastName: user?.lastName || "",
            email: user?.email || "",
            birthDate: user?.birthDate || "",
            country: user?.country || "México",
            state: user?.state || "",
            gender: user?.gender || undefined,
            postalCode: user?.postalCode || "",
            whatsapp: user?.whatsapp || "",
            password: "",
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
        mode: 'onTouched',
    });

    const passwordToWatch = isEditing ? "newPassword" : "password";
    const password = form.watch(passwordToWatch as "password" | "newPassword");


    useEffect(() => {
        // 1. Handle successful signup and client-side sign in
        if (state?.success && state.customToken) {
            setIsSigningIn(true);
            toast({ title: 'Cuenta creada', description: 'Sincronizando sesión...' });
    
            const handleSignInAndSession = async () => {
                const { success, idToken, error: signInError } = await signInWithToken(state.customToken!);
    
                if (!success || !idToken) {
                    toast({
                        title: 'Error de Autenticación',
                        description: signInError || 'No se pudo obtener el token de sesión.',
                        variant: 'destructive',
                    });
                    setIsSigningIn(false);
                    router.push('/login');
                    return;
                }
    
                try {
                    const response = await fetch('/api/auth/session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idToken }),
                    });
    
                    if (!response.ok) {
                        throw new Error('La creación de la sesión en el servidor falló.');
                    }
    
                    toast({ title: '¡Éxito!', description: 'Serás redirigido a tu panel.' });
                    router.push('/dashboard');
    
                } catch (sessionError) {
                    console.error("Session creation failed:", sessionError);
                    toast({
                        title: 'Error de Sesión',
                        description: 'No pudimos sincronizar tu sesión. Por favor, intenta iniciar sesión manualmente.',
                        variant: 'destructive',
                    });
                    setIsSigningIn(false);
                    router.push('/login');
                }
            };
    
            handleSignInAndSession();
            return;
        }

        // 2. Handle successful profile update (editing mode)
        if (state?.success && isEditing) {
            toast({
                title: "Éxito",
                description: state.message || "Tu perfil ha sido actualizado.",
            });
            form.reset({
                ...form.getValues(),
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
            return;
        }
        
        // 3. Handle any errors from the server action
        const errorMessage = state?.error || (state?.errors ? 'Datos proporcionados no válidos.' : null);
        if (errorMessage) {
            toast({
                variant: 'destructive',
                title: "Error en el formulario",
                description: errorMessage,
            });
        }
    }, [state, toast, form, isEditing, router]);

    const handleCountryChange = (countryName: string) => {
        const country = countries.find(c => c.name === countryName);
        setSelectedCountry(country);
        setStates(country ? country.states : []);
        form.setValue('country', countryName, { shouldValidate: true });
        form.setValue('state', '');
        form.clearErrors('state');
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value.replace(/\D/g, '');
        let formattedInput = '';

        if (input.length > 0) {
            formattedInput = input.substring(0, 2);
        }
        if (input.length > 2) {
            formattedInput += '/' + input.substring(2, 4);
        }
        if (input.length > 4) {
            formattedInput += '/' + input.substring(4, 8);
        }

        form.setValue('birthDate', formattedInput, { shouldValidate: true });
    };

    return (
        <Form {...form}>
            <form action={formAction} className="space-y-8 max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        {!isEditing && (
                             <div className="text-center mb-4">
                                <Link href="/" className="flex justify-center mb-4"><Logo /></Link>
                                <CardTitle>Crear una cuenta</CardTitle>
                                <CardDescription>Ingresa tu información para crear una cuenta</CardDescription>
                            </div>
                        )}
                        {isEditing && (
                            <>
                                <CardTitle>Editar Perfil</CardTitle>
                                <CardDescription>Actualiza tu información personal.</CardDescription>
                            </>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {state?.errors && (
                             <Alert variant={"destructive"}>
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{state.error || 'Por favor, revisa los campos del formulario.'}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre(s)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Tu nombre" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Apellidos</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Tus apellidos" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Correo Electrónico</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="m@example.com" {...field} disabled={isEditing} />
                                    </FormControl>
                                    <FormMessage />
                                 </FormItem>
                            )}
                        />
                        
                        {isEditing && (
                            <>
                               <FormField
                                    control={form.control}
                                    name="birthDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fecha de Nacimiento</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="DD/MM/AAAA" 
                                                    {...field}
                                                    value={field.value || ''}
                                                    onChange={handleDateChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>País</FormLabel>
                                            <Select onValueChange={handleCountryChange} value={field.value || ''}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona un país" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {countries.map(country => (
                                                        <SelectItem key={country.code} value={country.name}>{country.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="state"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Estado / Provincia</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || ''} disabled={!selectedCountry}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecciona un estado/provincia" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {states.map(state => (
                                                            <SelectItem key={state} value={state}>{state}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="postalCode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Código Postal</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Tu código postal" {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="gender"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                        <FormLabel>Género</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value || ''}
                                            className="flex flex-col sm:flex-row space-y-1"
                                            >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                <RadioGroupItem value="masculino" />
                                                </FormControl>
                                                <FormLabel className="font-normal">Masculino</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                <RadioGroupItem value="femenino" />
                                                </FormControl>
                                                <FormLabel className="font-normal">Femenino</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                <RadioGroupItem value="otro" />
                                                </FormControl>
                 
                                <FormLabel className="font-normal">Otro</FormLabel>
                                            </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="whatsapp"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Teléfono de WhatsApp (Opcional)</FormLabel>
                                            <FormControl>
                                                <Input type="tel" placeholder="+52 1 55 1234 5678" {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}
                       
                        {user && <input type="hidden" {...form.register('id')} />}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>{isEditing ? 'Cambiar Contraseña' : 'Define tu Contraseña'}</CardTitle>
                        <CardDescription>
                            {isEditing 
                                ? 'Si no deseas cambiar tu contraseña, deja estos campos en blanco.'
                                : 'Tu contraseña debe tener al menos 6 caracteres, una mayúscula, un número y un carácter especial.'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isEditing && (
                             <FormField
                                control={form.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contraseña Actual</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type={showPassword ? 'text' : 'password'} {...field} value={field.value || ''} />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                                    onClick={() => setShowPassword(prev => !prev)}
                                                >
                                                    {showPassword ? <EyeOff /> : <Eye />}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <div className={cn("grid grid-cols-1 gap-4", isEditing && "md:grid-cols-2")}>
                             <FormField
                                control={form.control}
                                name={isEditing ? "newPassword" : "password"}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{isEditing ? 'Nueva Contraseña' : 'Contraseña'}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type={showPassword ? 'text' : 'password'} {...field} value={field.value || ''} />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                                    onClick={() => setShowPassword(prev => !prev)}
                                                >
                                                    {showPassword ? <EyeOff /> : <Eye />}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{isEditing ? 'Repetir Nueva Contraseña': 'Repetir Contraseña'}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type={showPassword ? 'text' : 'password'} {...field} value={field.value || ''} />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                                    onClick={() => setShowPassword(prev => !prev)}
                                                >
                                                    {showPassword ? <EyeOff /> : <Eye />}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                         {!isEditing && (
                            <PasswordStrengthIndicator password={password} />
                         )}
                    </CardContent>
                    <CardFooter>
                         <div className="flex flex-col gap-4 w-full">
                            <SubmitButton isEditing={isEditing} isSigningIn={isSigningIn}/>
                            {!isEditing && (
                                 <div className="text-sm text-center text-muted-foreground">
                                    ¿Ya tienes una cuenta?{' '}
                                    <Link href="/login" className="underline hover:text-primary">
                                        Inicia Sesión
                                    </Link>
                                </div>
                            )}
                        </div>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
