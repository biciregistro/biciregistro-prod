'use client';

import { useActionState, useEffect, useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useFormStatus } from 'react-dom';
import Link from 'next/link';

import type { User } from '@/lib/types';
import { updateProfile, signup } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { countries, type Country } from '@/lib/countries';
import { profileFormSchema } from '@/lib/schemas';

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


type ProfileFormValues = z.infer<typeof profileFormSchema>;

function SubmitButton({ isEditing }: { isEditing?: boolean }) {
    const { pending } = useFormStatus();
    const text = isEditing ? 'Guardar Cambios' : 'Crear cuenta';
    const pendingText = isEditing ? 'Guardando...' : 'Creando...';
    return <Button type="submit" disabled={pending} className="w-full">{pending ? pendingText : text}</Button>;
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

// Define a unified state type for the form action
type FormState = {
    message?: string;
    error?: string;
    errors?: {
        [key: string]: string[] | undefined;
    };
} | null;


export function ProfileForm({ user }: { user?: User }) {
    const isEditing = !!user;
    const action = isEditing ? updateProfile : signup;
    const [state, formAction] = useActionState<FormState, FormData>(action, null);
    const { toast } = useToast();
    const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(countries.find(c => c.name === (user?.country || 'México')));
    const [states, setStates] = useState<string[]>(selectedCountry?.states || []);
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            id: user?.id,
            name: user?.name || "",
            lastName: user?.lastName || "",
            email: user?.email || "",
            birthDate: user?.birthDate || "",
            country: user?.country || "",
            state: user?.state || "",
            gender: user?.gender || undefined,
            postalCode: user?.postalCode || "",
            whatsapp: user?.whatsapp || "",
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
        mode: 'onTouched',
    });

    const newPassword = form.watch("newPassword");

    useEffect(() => {
        if (!state) return;

        // On successful signup, reset form and show success message
        if (state.message && !state.errors && !isEditing) {
            form.reset();
        }

        // On successful profile update, show success toast
        if (state.message && !state.errors && isEditing) {
            toast({
                title: "Éxito",
                description: state.message,
            });
            form.reset({
                ...form.getValues(),
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
        }
        
        // On any error (signup or update), show a destructive toast
        const errorMessage = state.error || state.message;
        if (errorMessage && (state.errors || state.error)) {
            toast({
                variant: 'destructive',
                title: state.errors ? "Error de Validación" : "Acción Fallida",
                description: errorMessage,
            });
        }
    }, [state, toast, form, isEditing]);

    const handleCountryChange = (countryName: string) => {
        const country = countries.find(c => c.name === countryName);
        setSelectedCountry(country);
        setStates(country ? country.states : []);
        form.setValue('country', countryName);
        form.setValue('state', ''); // Reset state/province
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

        form.setValue('birthDate', formattedInput);
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
                        {state?.message && !state.errors && !isEditing && (
                             <Alert variant={"default"}>
                                <AlertTitle>Éxito</AlertTitle>
                                <AlertDescription>{state.message}</AlertDescription>
                            </Alert>
                        )}
                         {state?.errors && (
                             <Alert variant={"destructive"}>
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{state.message || 'Por favor, revisa los campos del formulario.'}</AlertDescription>
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
                                    <Select onValueChange={handleCountryChange} defaultValue={field.value}>
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
                                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCountry}>
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
                                            <Input placeholder="Tu código postal" {...field} />
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
                                    defaultValue={field.value}
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
                                        <Input type="tel" placeholder="+52 1 55 1234 5678" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                       
                        {user && <input type="hidden" name="id" value={user.id} />}
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
                                                <Input type={showPassword ? 'text' : 'password'} {...field} />
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
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{isEditing ? 'Nueva Contraseña' : 'Contraseña'}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type={showPassword ? 'text' : 'password'} {...field} />
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
                                                <Input type={showPassword ? 'text' : 'password'} {...field} />
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
                            <PasswordStrengthIndicator password={newPassword} />
                         )}
                    </CardContent>
                    <CardFooter>
                         <div className="flex flex-col gap-4 w-full">
                            <SubmitButton isEditing={isEditing} />
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
