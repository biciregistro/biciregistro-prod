'use client';

import { useActionState, useEffect, useState, useRef, useTransition, Suspense } from 'react';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { EmailAuthProvider, reauthenticateWithCredential, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';

import type { User, ActionFormState } from '@/lib/types';
import { updateProfile, signup } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { countries, type Country } from '@/lib/countries';
import { getCities } from '@/lib/cities';
import { userFormSchema } from '@/lib/schemas';
import { signInWithToken, auth } from '@/lib/firebase/client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Eye, EyeOff, CheckCircle, XCircle, BellRing, Info } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Logo } from './icons/logo';
import { cn } from '@/lib/utils';

// Helper to convert ISO date (YYYY-MM-DD) to Display Format (DD/MM/YYYY)
const toDisplayDate = (val: string | undefined | null): string => {
    if (!val) return '';
    // If already DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) return val;
    // If YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [y, m, d] = val.split('-');
        return `${d}/${m}/${y}`;
    }
    return val;
};

// Helper to convert Display Format (DD/MM/YYYY) to ISO (YYYY-MM-DD) for backend
const toISODate = (val: string | undefined | null): string => {
    if (!val) return '';
    // If already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    // If DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
        const [d, m, y] = val.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return ''; 
};

// --- Dashboard Navigation ---
export function DashboardNav() {
    const pathname = usePathname();
    const navItems = [
      { href: '/dashboard', label: 'Mi Garaje' },
      { href: '/dashboard/register', label: 'Registrar Bici' },
      { href: '/dashboard/profile', label: 'Mi Perfil' },
    ];
  
    return (
      <nav className="grid items-start gap-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <span
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                pathname === item.href ? 'bg-accent' : 'transparent'
              )}
            >
              <span>{item.label}</span>
            </span>
          </Link>
        ))}
      </nav>
    );
}


type FormValues = z.infer<typeof userFormSchema>;

function SubmitButton({ isEditing, isSigningIn, isSubmitting, loadingAuth }: { isEditing?: boolean, isSigningIn?: boolean, isSubmitting?: boolean, loadingAuth?: boolean }) {
    const { pending } = useFormStatus();
    const isDisabled = pending || isSigningIn || isSubmitting || loadingAuth;

    let text = isEditing ? 'Guardar Cambios' : 'Crear cuenta';
    if (loadingAuth) text = 'Verificando...';
    if (isSigningIn) text = 'Finalizando...';

    let pendingText = isEditing ? 'Guardando...' : 'Creando...';
    if (isSigningIn) pendingText = 'Finalizando...';

    return <Button type="submit" disabled={isDisabled} className="w-full">{isDisabled ? pendingText : text}</Button>;
}

export function PasswordStrengthIndicator({ password = "" }: { password?: string }) {
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
        <div className="space-y-2 text-sm pt-2">
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

function ProfileFormContent({ user, communityId }: { user?: User, communityId?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl');
    const formRef = useRef<HTMLFormElement>(null);
    const [isPending, startTransition] = useTransition();
    const isEditing = !!user;
    const action = isEditing ? updateProfile : signup;
    
    const [state, formAction] = useActionState<ActionFormState, FormData>(action, null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(countries.find(c => c.name === (user?.country || 'México')));
    const [states, setStates] = useState<string[]>(selectedCountry?.states || []);
    const [cities, setCities] = useState<string[]>([]);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setFirebaseUser(user);
            setLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);

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
            city: user?.city || "",
            gender: user?.gender || undefined,
            postalCode: user?.postalCode || "",
            whatsapp: user?.whatsapp || "",
            
            // Notification Preferences Defaults
            // If editing, use existing prefs or default to false/true
            // If signing up, default safety=true, marketing=false
            notificationsSafety: isEditing ? (user?.notificationPreferences?.safety ?? true) : true,
            notificationsMarketing: isEditing ? (user?.notificationPreferences?.marketing ?? false) : false,

            password: "",
            confirmPassword: "",
            currentPassword: "",
            newPassword: "",
        },
        mode: 'onTouched',
    });

    const password = form.watch(isEditing ? "newPassword" : "password");

    // Initialize cities if state is already selected (e.g. on load)
    useEffect(() => {
        const currentCountry = form.getValues('country');
        const currentState = form.getValues('state');
        if (currentCountry && currentState) {
             const availableCities = getCities(currentCountry, currentState);
             setCities(availableCities);
        }
    }, [user, form]);


    useEffect(() => {
        setIsSubmitting(false);
        if (!state) return;

        if (state.success) {
            // This toast will show the message from the server action.
            toast({ title: "Éxito", description: state.message });
            
            if (state.passwordChanged) {
                // If the password was changed, the server has already killed the session.
                // Redirecting to login is the only necessary step.
                router.push('/login');
            } else if (isEditing) {
                // If only profile data was changed, redirect to dashboard.
                router.push('/dashboard');
            } else if (state.customToken) {
                // Handle new user signup session creation
                setIsSigningIn(true);
                const handleSignInAndSession = async () => {
                    const { success, idToken, error: signInError } = await signInWithToken(state.customToken!);
                    if (!success || !idToken) {
                        toast({ title: 'Error de Autenticación', description: signInError || 'No se pudo obtener el token de sesión.', variant: 'destructive' });
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
                        if (!response.ok) throw new Error('La creación de la sesión en el servidor falló.');
                        toast({ title: '¡Éxito!', description: 'Por favor, completa tu perfil para continuar.' });
                        
                        if (callbackUrl) {
                            router.push(callbackUrl);
                        } else {
                            router.push('/dashboard/profile');
                        }
                    } catch (sessionError) {
                        toast({ title: 'Error de Sesión', description: 'No pudimos sincronizar tu sesión. Por favor, intenta iniciar sesión manualmente.', variant: 'destructive' });
                        setIsSigningIn(false);
                        router.push('/login');
                    }
                };
                handleSignInAndSession();
            }
             form.reset({
                ...form.getValues(),
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
            return;
        }

        if (state.errors) {
            Object.keys(state.errors).forEach((key) => {
                const field = key as keyof FormValues;
                const message = state.errors?.[field]?.[0];
                if (message) {
                    form.setError(field, { type: 'server', message });
                }
            });
             toast({
                variant: 'destructive',
                title: "Error de Validación",
                description: state.error || "Por favor, revisa los campos marcados en rojo.",
            });
        } else if (state.error) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: state.error,
            });
        }
    }, [state, toast, form, isEditing, router, callbackUrl]);

    const handleCountryChange = (countryName: string) => {
        const country = countries.find(c => c.name === countryName);
        setSelectedCountry(country);
        setStates(country?.states || []);
        setCities([]);
        form.setValue('country', countryName);
        form.setValue('state', ''); 
        form.setValue('city', '');
    };

    const handleStateChange = (stateName: string) => {
        form.setValue('state', stateName);
        form.setValue('city', ''); // Reset city when state changes
        
        const countryName = form.getValues('country');
        if (countryName) {
            const availableCities = getCities(countryName, stateName);
            setCities(availableCities);
        } else {
            setCities([]);
        }
    };
    
    // Auto-format Date Logic
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        
        if (value.length > 8) value = value.substring(0, 8); // Max 8 digits (DDMMAAAA)

        // Insert slashes
        let formattedValue = '';
        if (value.length > 4) {
             formattedValue = `${value.substring(0, 2)}/${value.substring(2, 4)}/${value.substring(4)}`;
        } else if (value.length > 2) {
             formattedValue = `${value.substring(0, 2)}/${value.substring(2)}`;
        } else {
             formattedValue = value;
        }

        // Update the visual input
        e.target.value = formattedValue;

        // Transform to ISO for validation/submission only if complete or valid part
        // We will store the DD/MM/YYYY in the form state temporarily or ISO if complete?
        // Actually, userFormSchema expects a string. Zod will validate. 
        // Best approach: Store formatted value in form state so UI matches, 
        // BUT we need to convert to ISO before submission or let the schema handle it?
        // Our schema is loose on birthDate format currently, but backend expects ISO mostly.
        
        // Wait, the criteria says: "Although visually DD/MM/AAAA, upon submission it must be transformed... ideally ISO"
        // And the <Input> is controlled.
        
        onChange(formattedValue);
    };


    const handleFormSubmit = async (values: FormValues) => {
        const { currentPassword, newPassword, birthDate } = values;
        
        // Convert display date to ISO for submission
        if (birthDate) {
             const isoDate = toISODate(birthDate);
             if (isoDate) {
                 values.birthDate = isoDate;
             }
        }

        if (formRef.current) {
            const formData = new FormData(formRef.current);
            // Manually override the birthDate in formData because the input might have the formatted value
            if (values.birthDate) {
                formData.set('birthDate', values.birthDate);
            }

            startTransition(() => {
                if (!isEditing || !newPassword) {
                    formAction(formData);
                    return;
                }

                if (!currentPassword) {
                    form.setError('currentPassword', { type: 'manual', message: 'Debes introducir tu contraseña actual para cambiarla.' });
                    return;
                }
                
                if (!firebaseUser || !firebaseUser.email) {
                    toast({ title: "Error", description: "No se pudo encontrar el usuario actual. Por favor, inicia sesión de nuevo.", variant: 'destructive' });
                    return;
                }

                setIsSubmitting(true);
                const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
                
                reauthenticateWithCredential(firebaseUser, credential)
                    .then(() => {
                        formAction(formData);
                    })
                    .catch((error: any) => {
                        console.error("Re-authentication failed:", error);
                        let errorMessage = 'Ocurrió un error al verificar tu identidad.';
                        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                            errorMessage = 'La contraseña actual no es correcta.';
                            form.setError('currentPassword', { type: 'manual', message: errorMessage });
                        }
                        toast({
                            title: 'Error de Autenticación',
                            description: errorMessage,
                            variant: 'destructive',
                        });
                    })
                    .finally(() => {
                        setIsSubmitting(false);
                    });
            });
        }
    };

    const loginLink = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login";

    return (
        <Form {...form}>
            <form 
                ref={formRef}
                onSubmit={form.handleSubmit(handleFormSubmit)} 
                className="space-y-8 max-w-2xl mx-auto"
            >
                {!isEditing && communityId && <input type="hidden" name="communityId" value={communityId} />}
                {/* Form content remains the same */}
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
                                                    type="text" 
                                                    inputMode="numeric"
                                                    placeholder="DD/MM/AAAA"
                                                    {...field}
                                                    value={toDisplayDate(field.value) || ''}
                                                    onChange={(e) => handleDateChange(e, field.onChange)}
                                                />
                                            </FormControl>
                                            <FormDescription>Ej. 25/12/1990</FormDescription>
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
                                            <Select onValueChange={handleCountryChange} value={field.value || ''} name={field.name}>
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
                                                <Select onValueChange={handleStateChange} value={field.value || ''} disabled={!selectedCountry} name={field.name}>
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
                                        name="city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Municipio / Ciudad</FormLabel>
                                                {cities.length > 0 ? (
                                                     <Select onValueChange={field.onChange} value={field.value || ''} disabled={!form.watch('state')} name={field.name}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecciona un municipio" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {cities.map(city => (
                                                                <SelectItem key={city} value={city}>{city}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <FormControl>
                                                        <Input placeholder="Escribe tu municipio" {...field} value={field.value || ''} />
                                                    </FormControl>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                
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
                                            name={field.name}
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
                        
                        {/* Seccion de Preferencias de Notificacion (Visible en Registro y Edición) */}
                         <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-medium flex items-center gap-2">
                                <BellRing className="h-5 w-5" />
                                Preferencias de Notificación
                            </h3>
                            <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                                <FormField
                                    control={form.control}
                                    name="notificationsSafety"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-background">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    name={field.name}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    Seguridad y Comunidad
                                                </FormLabel>
                                                <FormDescription>
                                                    Recibe alertas sobre el estado de tu bicicleta (Robo, indicios, mantenimiento) y avisos importantes de la comunidad.
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="notificationsMarketing"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-background">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    name={field.name}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    Eventos y Promociones
                                                </FormLabel>
                                                <FormDescription>
                                                    Entérate de nuevos eventos, talleres y ofertas exclusivas para ciclistas.
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                       
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
                        <div className={cn("grid grid-cols-1 gap-4", !isEditing && "md:grid-cols-2")}>
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
                         <PasswordStrengthIndicator password={password} />
                    </CardContent>
                    <CardFooter>
                         <div className="flex flex-col gap-4 w-full">
                            <SubmitButton isEditing={isEditing} isSigningIn={isSigningIn} isSubmitting={isSubmitting || isPending} loadingAuth={loadingAuth} />
                            {!isEditing && (
                                 <div className="text-sm text-center text-muted-foreground">
                                    ¿Ya tienes una cuenta?{' '}
                                    <Link href={loginLink} className="underline hover:text-primary">
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

export function ProfileForm({ user, communityId }: { user?: User, communityId?: string }) {
    return (
        <Suspense fallback={<div>Cargando formulario...</div>}>
            <ProfileFormContent user={user} communityId={communityId} />
        </Suspense>
    );
}
