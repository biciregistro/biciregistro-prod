'use client';

import { useActionState, useEffect, useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useFormStatus } from 'react-dom';

import type { User } from '@/lib/types';
import { updateProfile } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { countries, type Country } from '@/lib/countries';

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';


const profileFormSchema = z.object({
    id: z.string(),
    name: z.string().min(2, "El nombre es obligatorio."),
    lastName: z.string().min(2, "Los apellidos son obligatorios."),
    birthDate: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    gender: z.enum(['masculino', 'femenino', 'otro']).optional(),
    postalCode: z.string().optional(),
    whatsapp: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
}).refine(data => {
    if (data.newPassword || data.confirmPassword) {
        return data.newPassword === data.confirmPassword;
    }
    return true;
}, {
    message: "Las nuevas contraseñas no coinciden.",
    path: ["confirmPassword"],
}).refine(data => {
    if (data.newPassword) {
        return data.newPassword.length >= 6;
    }
    return true;
}, {
    message: "La nueva contraseña debe tener al menos 6 caracteres.",
    path: ["newPassword"],
});


type ProfileFormValues = z.infer<typeof profileFormSchema>;

function SubmitButton() {
    const { pending } = useFormStatus();
    return <Button type="submit" disabled={pending} className="w-full">{pending ? 'Guardando...' : 'Guardar Cambios'}</Button>;
}

export function ProfileForm({ user }: { user: User }) {
    const [state, formAction] = useActionState(updateProfile, null);
    const { toast } = useToast();
    const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(countries.find(c => c.name === (user.country || 'México')));
    const [states, setStates] = useState<string[]>(selectedCountry?.states || []);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            id: user.id,
            name: user.name || "",
            lastName: user.lastName || "",
            birthDate: user.birthDate || "",
            country: user.country || "",
            state: user.state || "",
            gender: user.gender || undefined,
            postalCode: user.postalCode || "",
            whatsapp: user.whatsapp || "",
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    useEffect(() => {
        if (state?.message) {
            toast({
                title: state.errors ? "Error" : "Éxito",
                description: state.message,
                variant: state.errors ? "destructive" : "default",
            });
            if (!state.errors) {
                form.reset({
                    ...form.getValues(),
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                });
            }
        }
    }, [state, toast, form]);

    const handleCountryChange = (countryName: string) => {
        const country = countries.find(c => c.name === countryName);
        setSelectedCountry(country);
        setStates(country ? country.states : []);
        form.setValue('country', countryName);
        form.setValue('state', ''); // Reset state/province
    };

    return (
        <Form {...form}>
            <form action={formAction} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Editar Perfil</CardTitle>
                        <CardDescription>Actualiza tu información personal.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {state?.message && !state.errors && (
                             <Alert variant={"default"}>
                                <AlertTitle>Éxito</AlertTitle>
                                <AlertDescription>{state.message}</AlertDescription>
                            </Alert>
                        )}
                         {state?.errors && (
                             <Alert variant={"destructive"}>
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{Object.values(state.errors).flat().join(', ')}</AlertDescription>
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
                            name="birthDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha de Nacimiento</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value ? (
                                                format(parseISO(field.value), "PPP")
                                            ) : (
                                                <span>Elige una fecha</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value ? parseISO(field.value) : undefined}
                                                onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                                                disabled={(date) =>
                                                    date > new Date() || date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
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
                       
                        <input type="hidden" name="id" value={user.id} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Cambiar Contraseña</CardTitle>
                        <CardDescription>Si no deseas cambiar tu contraseña, deja estos campos en blanco.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <FormField
                            control={form.control}
                            name="currentPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contraseña Actual</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nueva Contraseña</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
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
                                        <FormLabel>Repetir Nueva Contraseña</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <SubmitButton />
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
