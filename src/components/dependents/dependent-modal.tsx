'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dependent } from '@/lib/types';
import { dependentFormSchema } from '@/lib/schemas';
import { saveDependentAction } from '@/lib/actions/dependent-actions';

type DependentFormValues = z.infer<typeof dependentFormSchema>;

interface DependentRegistrationModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSuccess: (dependent: Dependent) => void;
    existingDependents: Dependent[];
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function DependentRegistrationModal({ isOpen, onOpenChange, onSuccess, existingDependents }: DependentRegistrationModalProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [mode, setMode] = useState<'select' | 'create'>(existingDependents.length > 0 ? 'select' : 'create');

    const form = useForm<DependentFormValues>({
        resolver: zodResolver(dependentFormSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            gender: 'Masculino',
            bloodType: '',
            allergies: '',
        },
    });
    
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        form.setValue('dateOfBirth', formattedValue);
    };
    
    function onSubmit(values: DependentFormValues) {
        startTransition(async () => {
            const result = await saveDependentAction(values);

            if (result.success && result.dependentId) {
                toast({ title: "Menor Registrado", description: "El perfil del menor ha sido guardado." });
                
                const [day, month, year] = values.dateOfBirth.split('/');
                const birthDateAsDate = new Date(`${year}-${month}-${day}`);

                // Construct the dependent object for the parent component
                const newDependent: Dependent = {
                    id: result.dependentId,
                    tutorId: '', // The parent component doesn't need this immediately
                    firstName: values.firstName,
                    lastName: values.lastName,
                    dateOfBirth: birthDateAsDate,
                    gender: values.gender,
                    bloodType: values.bloodType,
                    allergies: values.allergies,
                };

                onSuccess(newDependent);
                form.reset();
                onOpenChange(false);
            } else {
                toast({
                    title: "Error",
                    description: result.error || "No se pudo guardar el perfil del menor.",
                    variant: "destructive",
                });
            }
        });
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                form.reset();
                setMode(existingDependents.length > 0 ? 'select' : 'create');
            }
            onOpenChange(open);
        }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Datos del Menor</DialogTitle>
                    <DialogDescription>
                        {mode === 'select' && existingDependents.length > 0
                            ? "Selecciona un menor ya registrado o agrega uno nuevo."
                            : "Ingresa los datos del menor que participará en el evento."
                        }
                    </DialogDescription>
                </DialogHeader>

                {mode === 'select' && existingDependents.length > 0 && (
                    <div className="space-y-4 py-4">
                        <p className="font-semibold text-sm">Elegir un menor guardado:</p>
                        <div className="grid gap-2">
                            {existingDependents.map(dep => (
                                <Button key={dep.id} variant="outline" className="justify-start h-auto py-2" onClick={() => onSuccess(dep)}>
                                    {dep.firstName} {dep.lastName}
                                </Button>
                            ))}
                        </div>
                        <Button variant="link" className="p-0 h-auto" onClick={() => setMode('create')}>
                            O registrar un menor nuevo
                        </Button>
                    </div>
                )}
                
                {(mode === 'create' || existingDependents.length === 0) && (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                               <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nombre(s)</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
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
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="dateOfBirth"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fecha de Nacimiento</FormLabel>
                                            <FormControl><Input {...field} placeholder="DD/MM/AAAA" onChange={handleDateChange} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="bloodType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Sangre</FormLabel>
                                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {BLOOD_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="gender"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Género</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                                    <FormItem className="flex items-center space-x-2">
                                                        <FormControl><RadioGroupItem value="Masculino" /></FormControl>
                                                        <FormLabel className="font-normal">Masculino</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-2">
                                                        <FormControl><RadioGroupItem value="Femenino" /></FormControl>
                                                        <FormLabel className="font-normal">Femenino</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-2">
                                                        <FormControl><RadioGroupItem value="Otro" /></FormControl>
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
                                    name="allergies"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Alergias (Opcional)</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Ej. Penicilina, látex, o 'Ninguna'" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <DialogFooter>
                                {existingDependents.length > 0 && (
                                    <Button type="button" variant="ghost" onClick={() => setMode('select')} disabled={isPending}>
                                        Volver a Selección
                                    </Button>
                                )}
                                <Button type="submit" disabled={isPending}>
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Guardar Menor
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
