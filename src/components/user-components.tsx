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
import { format } from 'date-fns';


const profileFormSchema = z.object({
    id: z.string(),
    name: z.string().min(2, "El nombre es obligatorio."),
    lastName: z.string().min(2, "Los apellidos son obligatorios."),
    birthDate: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
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
        },
    });

    useEffect(() => {
        if (state?.message) {
            toast({
                title: state.errors ? "Error" : "Éxito",
                description: state.message,
                variant: state.errors ? "destructive" : "default",
            });
        }
    }, [state, toast]);

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
                        {state?.message && (
                             <Alert variant={state.errors ? "destructive" : "default"}>
                                <AlertTitle>{state.errors ? 'Error' : 'Éxito'}</AlertTitle>
                                <AlertDescription>{state.message}</AlertDescription>
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
                                                format(new Date(field.value), "PPP")
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
                                                selected={field.value ? new Date(field.value) : undefined}
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
                       
                        <input type="hidden" name="id" value={user.id} />

                    </CardContent>
                    <CardFooter>
                        <SubmitButton />
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}