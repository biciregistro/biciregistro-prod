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
import { useGamificationToast } from '@/hooks/use-gamification-toast';

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Eye, EyeOff, CheckCircle, XCircle, BellRing, Ambulance, User as UserIcon, ShieldCheck } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Logo } from './icons/logo';
import { cn } from '@/lib/utils';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Date Helpers
const toDisplayDate = (val: string | undefined | null): string => {
    if (!val) return '';
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) return val;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [y, m, d] = val.split('-');
        return `${d}/${m}/${y}`;
    }
    return val;
};

const toISODate = (val: string | undefined | null): string => {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
        const [d, m, y] = val.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return ''; 
};

// Modificamos el Schema base SOLO para el frontend. 
// Hacemos que todos los campos sean super flexibles temporalmente para que react-hook-form 
// no bloquee el submit por errores en campos que están "ocultos" en otra pestaña.
// La validación estricta y segura SIEMPRE sucede en el Server Action (updateProfile) con el payload completo.
const looseFormSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional().or(z.literal('')),
    lastName: z.string().optional().or(z.literal('')),
    email: z.string().email().optional().or(z.literal('')),
    birthDate: z.string().optional().or(z.literal('')),
    country: z.string().optional().or(z.literal('')),
    state: z.string().optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    gender: z.enum(['masculino', 'femenino', 'otro']).optional(),
    postalCode: z.string().optional().or(z.literal('')),
    whatsapp: z.string().optional().or(z.literal('')),
    emergencyContactName: z.string().optional().or(z.literal('')),
    emergencyContactPhone: z.string().optional().or(z.literal('')),
    bloodType: z.string().optional().or(z.literal('')),
    allergies: z.string().optional().or(z.literal('')),
    notificationsSafety: z.boolean().optional(),
    notificationsMarketing: z.boolean().optional(),
    password: z.string().optional(), // FIX: Agregado para el registro
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
    termsAccepted: z.boolean().optional(),
    communityId: z.string().optional()
});

type FormValues = z.infer<typeof looseFormSchema>;

function SubmitButton({ isEditing, isSigningIn, isSubmitting, loadingAuth, termsAccepted }: { isEditing?: boolean, isSigningIn?: boolean, isSubmitting?: boolean, loadingAuth?: boolean, termsAccepted?: boolean }) {
    const { pending } = useFormStatus();
    const termsValid = isEditing ? true : termsAccepted;
    const isDisabled = pending || isSigningIn || isSubmitting || loadingAuth || !termsValid;

    let text = isEditing ? 'Guardar Cambios' : 'Crear cuenta';
    if (loadingAuth) text = 'Verificando...';
    if (isSigningIn) text = 'Finalizando...';

    let pendingText = isEditing ? 'Guardando...' : 'Creando...';
    if (isSigningIn) pendingText = 'Finalizando...';

    return (
        <Button 
            type="submit" 
            disabled={isDisabled} 
            className="w-full h-12 text-lg font-bold shadow-lg bg-primary hover:bg-primary/90 text-white"
        >
            {isDisabled && !termsValid && !isEditing ? 'Acepta los términos' : (isDisabled ? pendingText : text)}
        </Button>
    );
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

function ProfileFormContent({ user, communityId, callbackUrl: propCallbackUrl }: { user?: User, communityId?: string, callbackUrl?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = propCallbackUrl || searchParams.get('callbackUrl');
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
    const { showRewardToast } = useGamificationToast();
    
    const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(countries.find(c => c.name === (user?.country || 'México')));
    const [states, setStates] = useState<string[]>(selectedCountry?.states || []);
    const [cities, setCities] = useState<string[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Navigation Tab state for Mobile Feel
    const [activeTab, setActiveTab] = useState("general");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setFirebaseUser(user);
            setLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);

    const form = useForm<FormValues>({
        resolver: zodResolver(isEditing ? looseFormSchema : (userFormSchema as unknown as z.ZodType<FormValues>)),
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
            
            emergencyContactName: user?.emergencyContactName || "",
            emergencyContactPhone: user?.emergencyContactPhone || "",
            bloodType: user?.bloodType || "",
            allergies: user?.allergies || "",

            notificationsSafety: isEditing ? (user?.notificationPreferences?.safety ?? true) : true,
            notificationsMarketing: isEditing ? (user?.notificationPreferences?.marketing ?? false) : false,

            password: "",
            confirmPassword: "",
            currentPassword: "",
            newPassword: "",
        },
        mode: 'onSubmit',
    });

    // FIX: Separamos el watch para evitar problemas de tipos con ternarias dinámicas
    const signupPassword = form.watch("password");
    const editNewPassword = form.watch("newPassword");
    const passwordValue = isEditing ? editNewPassword : signupPassword;

    const watchedCountry = form.watch('country');
    const watchedState = form.watch('state');

    useEffect(() => {
        if (watchedCountry && watchedState) {
             const availableCities = getCities(watchedCountry, watchedState);
             setCities(availableCities);
        } else {
             setCities([]);
        }
    }, [watchedCountry, watchedState]);


    useEffect(() => {
        setIsSubmitting(false);
        if (!state) return;

        if (state.success) {
            if (isEditing && state.pointsAwarded) {
                showRewardToast(state.pointsAwarded as number, "¡Perfil Completado! Has fortalecido tu seguridad y ganado kilómetros.");
            } else {
                toast({ title: "Éxito", description: state.message });
            }
            
            if (state.passwordChanged) {
                router.push('/login');
                return;
            } else if (isEditing) {
                // FIX: Instead of router.push('/dashboard') which changes the page,
                // we refresh the router to update global states (like header name/km) 
                // but keep the user on the same tab and page they are currently editing.
                router.refresh();
            } else if (state.customToken) {
                setIsSigningIn(true);
                const handleSignInAndSession = async () => {
                    const { success, idToken, error: signInError } = await signInWithToken(state.customToken!);
                    if (!success || !idToken) {
                        toast({ title: 'Error', description: signInError, variant: 'destructive' });
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
                        if (!response.ok) throw new Error('Falló sesión.');
                        toast({ title: '¡Éxito!', description: 'Completa tu perfil.' });
                        
                        let targetUrl = callbackUrl || '/dashboard/profile';
                        if (state.pointsAwarded) {
                            const separator = targetUrl.includes('?') ? '&' : '?';
                            targetUrl += `${separator}welcome=100`;
                        }
                        router.push(targetUrl);

                    } catch (sessionError) {
                        setIsSigningIn(false);
                        router.push('/login');
                    }
                };
                handleSignInAndSession();
                return;
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
            let errorTabToFocus = activeTab;
            const errorObj = state.errors as Record<string, string[]>;

            Object.keys(errorObj).forEach((key) => {
                const message = errorObj[key]?.[0];
                if (message) {
                    form.setError(key as any, { type: 'server', message });

                    if (['name', 'lastName', 'birthDate', 'country', 'state', 'city', 'gender'].includes(key)) {
                        errorTabToFocus = 'general';
                    } else if (['emergencyContactName', 'emergencyContactPhone', 'bloodType'].includes(key)) {
                        errorTabToFocus = 'emergency';
                    } else if (['currentPassword', 'newPassword', 'confirmPassword'].includes(key)) {
                        errorTabToFocus = 'security';
                    }
                }
            });
            
            if (errorTabToFocus !== activeTab) {
                setActiveTab(errorTabToFocus);
            }

            toast({
                variant: 'destructive',
                title: "Información Incompleta",
                description: state.error || "Por favor revisa los campos requeridos.",
            });
        } else if (state.error) {
            toast({ variant: 'destructive', title: "Error", description: state.error });
        }
    }, [state, toast, form, isEditing, router, callbackUrl, showRewardToast, activeTab]);

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
        form.setValue('city', '');
        
        const countryName = form.getValues('country');
        if (countryName) {
            const availableCities = getCities(countryName, stateName);
            setCities(availableCities);
        } else {
            setCities([]);
        }
    };
    
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 8) value = value.substring(0, 8);
        let formattedValue = '';
        if (value.length > 4) {
             formattedValue = `${value.substring(0, 2)}/${value.substring(2, 4)}/${value.substring(4)}`;
        } else if (value.length > 2) {
             formattedValue = `${value.substring(0, 2)}/${value.substring(2)}`;
        } else {
             formattedValue = value;
        }
        e.target.value = formattedValue;
        onChange(formattedValue);
    };

    const handleFormSubmit = async (values: FormValues) => {
        if (!isEditing && !termsAccepted) {
            toast({ title: "Atención", description: "Debes aceptar los Términos.", variant: "destructive" });
            return;
        }

        const { currentPassword, newPassword, birthDate } = values;
        
        if (birthDate) {
             const isoDate = toISODate(birthDate);
             if (isoDate) values.birthDate = isoDate;
        }

        if (formRef.current) {
            const formData = new FormData(formRef.current);
            
            // Re-hidratar campos que pudieran estar ocultos por el tab forceMount
            Object.entries(values).forEach(([key, val]) => {
                if (val !== undefined && val !== null) {
                    if (typeof val === 'boolean') {
                        formData.set(key, val ? 'on' : 'false');
                    } else if (!formData.has(key)) {
                        formData.set(key, String(val));
                    }
                }
            });

            if (values.birthDate) formData.set('birthDate', values.birthDate);
            if (!isEditing) formData.set('termsAccepted', 'true');
            if (communityId) formData.set('communityId', communityId);

            startTransition(() => {
                if (!isEditing || !newPassword) {
                    formAction(formData);
                    return;
                }

                if (!currentPassword) {
                    form.setError('currentPassword' as any, { type: 'manual', message: 'Contraseña actual requerida.' });
                    setActiveTab("security");
                    return;
                }
                
                if (!firebaseUser || !firebaseUser.email) return;

                setIsSubmitting(true);
                const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
                
                reauthenticateWithCredential(firebaseUser, credential)
                    .then(() => {
                        formAction(formData);
                    })
                    .catch((error: any) => {
                        let errorMessage = 'Error al verificar identidad.';
                        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                            errorMessage = 'Contraseña actual incorrecta.';
                            form.setError('currentPassword' as any, { type: 'manual', message: errorMessage });
                        }
                        toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
                        setActiveTab("security");
                    })
                    .finally(() => setIsSubmitting(false));
            });
        }
    };

    const onInvalidSubmit = (errors: any) => {
        let errorTabToFocus = activeTab;
        const errorKeys = Object.keys(errors);

        if (errorKeys.length > 0) {
            const firstErrorKey = errorKeys[0];

            if (['name', 'lastName', 'birthDate', 'country', 'state', 'city', 'gender'].includes(firstErrorKey)) {
                errorTabToFocus = 'general';
            } else if (['emergencyContactName', 'emergencyContactPhone', 'bloodType'].includes(firstErrorKey)) {
                errorTabToFocus = 'emergency';
            } else if (['currentPassword', 'newPassword', 'confirmPassword'].includes(firstErrorKey)) {
                errorTabToFocus = 'security';
            }

            if (errorTabToFocus !== activeTab) {
                setActiveTab(errorTabToFocus);
            }

            toast({
                variant: 'destructive',
                title: "Información Incompleta",
                description: "Por favor completa todos los campos obligatorios.",
            });
        }
    };

    if (!isEditing) {
        return (
            <Form {...form}>
                <form ref={formRef} onSubmit={form.handleSubmit(handleFormSubmit, onInvalidSubmit)} className="space-y-8 max-w-2xl mx-auto">
                    {communityId && <input type="hidden" name="communityId" value={communityId} />}
                    <Card>
                        <CardHeader>
                            <div className="text-center mb-4">
                                <Link href="/" className="flex justify-center mb-4"><Logo /></Link>
                                <CardTitle>Crear una cuenta</CardTitle>
                                <CardDescription>Ingresa tu información para crear una cuenta</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 px-4 sm:px-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Nombre(s)</FormLabel><FormControl><Input placeholder="Tu nombre" {...field} value={(field.value as string) || ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="lastName" render={({ field }) => (
                                    <FormItem><FormLabel>Apellidos</FormLabel><FormControl><Input placeholder="Tus apellidos" {...field} value={(field.value as string) || ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input type="email" placeholder="m@example.com" {...field} value={(field.value as string) || ''} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Define tu Contraseña</CardTitle>
                            <CardDescription>Mínimo 6 caracteres, mayúscula, número y carácter especial.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 px-4 sm:px-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contraseña</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type={showPassword ? 'text' : 'password'} {...field} value={(field.value as string) || ''} />
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
                                                <Input type={showPassword ? 'text' : 'password'} {...field} value={(field.value as string) || ''} />
                                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(prev => !prev)}>
                                                    {showPassword ? <EyeOff /> : <Eye />}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <PasswordStrengthIndicator password={passwordValue as string} />
                            <div className="flex items-start space-x-2 pt-4">
                                <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked as boolean)} />
                                <div className="grid gap-1.5 leading-none">
                                    <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        He leído y acepto los <Link href="/terms" target="_blank" className="text-primary hover:underline">Términos y Condiciones</Link> y el <Link href="/privacy" target="_blank" className="text-primary hover:underline">Aviso de Privacidad</Link>
                                    </label>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <div className="flex flex-col gap-4 w-full">
                                <SubmitButton isSigningIn={isSigningIn} isSubmitting={isSubmitting || isPending} loadingAuth={loadingAuth} termsAccepted={termsAccepted} />
                                <div className="text-sm text-center text-muted-foreground">
                                    ¿Ya tienes una cuenta? <Link href="/login" className="underline hover:text-primary">Inicia Sesión</Link>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
        );
    }

    // --- TABBED LAYOUT FOR EDITING (MOBILE APP STYLE) ---
    return (
        <Form {...form}>
            <form 
                ref={formRef}
                onSubmit={form.handleSubmit(handleFormSubmit, onInvalidSubmit)} 
                className="w-full max-w-2xl mx-auto flex flex-col min-h-[calc(100vh-140px)]"
            >
                {user && <input type="hidden" {...form.register('id')} />}
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-grow">
                    <TabsList className="grid grid-cols-4 h-14 bg-muted/30 p-1 mb-6 rounded-xl border border-border/50">
                        <TabsTrigger value="general" className="flex flex-col gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-lg py-2 transition-all">
                            <UserIcon className="h-4 w-4" />
                            <span className="text-[10px] sm:text-xs font-semibold">General</span>
                        </TabsTrigger>
                        <TabsTrigger value="emergency" className="flex flex-col gap-1 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2 transition-all">
                            <Ambulance className="h-4 w-4" />
                            <span className="text-[10px] sm:text-xs font-semibold">Emergencia</span>
                        </TabsTrigger>
                        <TabsTrigger value="alerts" className="flex flex-col gap-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2 transition-all">
                            <BellRing className="h-4 w-4" />
                            <span className="text-[10px] sm:text-xs font-semibold">Alertas</span>
                        </TabsTrigger>
                        <TabsTrigger value="security" className="flex flex-col gap-1 data-[state=active]:bg-slate-800 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg py-2 transition-all">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-[10px] sm:text-xs font-semibold">Seguridad</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" forceMount className={cn("space-y-4 focus-visible:outline-none", activeTab !== 'general' && 'hidden')}>
                        <Card className="border-0 shadow-none sm:border sm:shadow-sm">
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle>Datos Personales</CardTitle>
                                <CardDescription>La información básica de tu identidad digital.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 px-4 sm:px-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel>Nombre(s)</FormLabel><FormControl><Input placeholder="Tu nombre" {...field} value={(field.value as string) || ''} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="lastName" render={({ field }) => (
                                        <FormItem><FormLabel>Apellidos</FormLabel><FormControl><Input placeholder="Tus apellidos" {...field} value={(field.value as string) || ''} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input type="email" {...field} disabled={true} value={(field.value as string) || ''} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="birthDate" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha de Nacimiento</FormLabel>
                                        <FormControl>
                                            <Input type="text" inputMode="numeric" placeholder="DD/MM/AAAA" {...field} value={toDisplayDate(field.value as string) || ''} onChange={(e) => handleDateChange(e, field.onChange)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="gender" render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Género</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} value={(field.value as string) || ''} className="flex flex-row space-x-4" name={field.name}>
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="masculino" /></FormControl><FormLabel className="font-normal">M</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="femenino" /></FormControl><FormLabel className="font-normal">F</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="otro" /></FormControl><FormLabel className="font-normal">Otro</FormLabel></FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="whatsapp" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Teléfono / WhatsApp (Opcional)</FormLabel>
                                        <FormControl><Input type="tel" placeholder="+52..." {...field} value={(field.value as string) || ''} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                
                                <div className="pt-4 mt-4 border-t space-y-4">
                                    <h4 className="font-medium text-sm text-muted-foreground">Ubicación</h4>
                                    <FormField control={form.control} name="country" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>País</FormLabel>
                                            <Select onValueChange={handleCountryChange} value={(field.value as string) || ''} name={field.name}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecciona país" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {countries.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="state" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Estado</FormLabel>
                                                <Select onValueChange={handleStateChange} value={(field.value as string) || ''} disabled={!selectedCountry} name={field.name}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="city" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Municipio</FormLabel>
                                                {cities.length > 0 ? (
                                                    <Select onValueChange={field.onChange} value={(field.value as string) || ''} disabled={!form.watch('state')} name={field.name}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Municipio" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            {cities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <FormControl><Input placeholder="Tu municipio" {...field} value={(field.value as string) || ''} /></FormControl>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="emergency" forceMount className={cn("space-y-4 focus-visible:outline-none", activeTab !== 'emergency' && 'hidden')}>
                        <Card className="border-0 shadow-none sm:border sm:shadow-sm border-t-4 sm:border-t-red-500 border-t-red-500 rounded-t-none sm:rounded-t-lg">
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle className="flex items-center gap-2 text-red-600"><Ambulance className="w-5 h-5"/> Datos Médicos</CardTitle>
                                <CardDescription>Esta información formará parte de tu Etiqueta de Emergencia (QR) para agilizar atención médica.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 px-4 sm:px-6 bg-red-50/30 p-4 sm:p-6 rounded-b-xl sm:rounded-b-lg">
                                <div className="grid grid-cols-1 gap-4">
                                    <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
                                        <FormItem><FormLabel>Nombre del Contacto</FormLabel><FormControl><Input placeholder="Familiar o amigo" {...field} value={(field.value as string) || ''} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (
                                        <FormItem><FormLabel>Teléfono de Emergencia</FormLabel><FormControl><Input type="tel" placeholder="10 dígitos" {...field} value={(field.value as string) || ''} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="bloodType" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Sangre</FormLabel>
                                            <Select onValueChange={field.onChange} value={(field.value as string) || ''} name={field.name}>
                                                <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Seleccionar" /></SelectTrigger></FormControl>
                                                <SelectContent>{BLOOD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="allergies" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Alergias o Condiciones (Opcional)</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Diabetes, alergia a penicilina, etc. O escribe 'Ninguna'" className="bg-white resize-none" {...field} value={(field.value as string) || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="alerts" forceMount className={cn("space-y-4 focus-visible:outline-none", activeTab !== 'alerts' && 'hidden')}>
                         <Card className="border-0 shadow-none sm:border sm:shadow-sm">
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle>Preferencias de Notificación</CardTitle>
                                <CardDescription>Decide qué información deseas recibir en tu correo o teléfono.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 px-4 sm:px-6">
                                <FormField control={form.control} name="notificationsSafety" render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-background">
                                        {/* FIX: Envolvemos onChange en un timeout para evitar error flushSync con Radix + Slot */}
                                        <FormControl>
                                            <Checkbox 
                                                checked={field.value as boolean} 
                                                onCheckedChange={(checked) => {
                                                    setTimeout(() => field.onChange(checked), 0);
                                                }} 
                                                name={field.name} 
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Seguridad y Comunidad (Recomendado)</FormLabel>
                                            <FormDescription>Recibe alertas sobre robos cercanos y el estado legal de tu bicicleta.</FormDescription>
                                        </div>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="notificationsMarketing" render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-background">
                                        <FormControl>
                                            <Checkbox 
                                                checked={field.value as boolean} 
                                                onCheckedChange={(checked) => {
                                                    setTimeout(() => field.onChange(checked), 0);
                                                }} 
                                                name={field.name} 
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Eventos y Beneficios</FormLabel>
                                            <FormDescription>Entérate de nuevas rodadas, carreras y recompensas de aliados.</FormDescription>
                                        </div>
                                    </FormItem>
                                )} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="security" forceMount className={cn("space-y-4 focus-visible:outline-none", activeTab !== 'security' && 'hidden')}>
                         <Card className="border-0 shadow-none sm:border sm:shadow-sm">
                            <CardHeader className="px-4 sm:px-6">
                                <CardTitle>Cambiar Contraseña</CardTitle>
                                <CardDescription>Si no deseas cambiarla, deja estos campos en blanco.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 px-4 sm:px-6">
                                <FormField control={form.control} name="currentPassword" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contraseña Actual</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type={showPassword ? 'text' : 'password'} {...field} value={(field.value as string) || ''} />
                                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(prev => !prev)}>
                                                    {showPassword ? <EyeOff /> : <Eye />}
                                                </Button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="newPassword" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nueva Contraseña</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type={showPassword ? 'text' : 'password'} {...field} value={(field.value as string) || ''} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Repetir Nueva Contraseña</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type={showPassword ? 'text' : 'password'} {...field} value={(field.value as string) || ''} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <PasswordStrengthIndicator password={passwordValue as string} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <div className="mt-8 mb-6 sticky bottom-36 sm:static z-30 px-4 sm:px-0">
                    <SubmitButton 
                        isEditing={isEditing} 
                        isSigningIn={isSigningIn} 
                        isSubmitting={isSubmitting || isPending} 
                        loadingAuth={loadingAuth} 
                        termsAccepted={termsAccepted}
                    />
                </div>
            </form>
        </Form>
    );
}

export function ProfileForm({ user, communityId, callbackUrl }: { user?: User, communityId?: string, callbackUrl?: string }) {
    return (
        <Suspense fallback={<div>Cargando formulario...</div>}>
            <ProfileFormContent user={user} communityId={communityId} callbackUrl={callbackUrl} />
        </Suspense>
    );
}
