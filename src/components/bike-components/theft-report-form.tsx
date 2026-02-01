'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import dynamic from 'next/dynamic';

import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, MapPin, CalendarClock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { countries, type Country } from '@/lib/countries';
import { getCities } from '@/lib/cities';
import { reportTheft } from '@/lib/actions';
import type { Bike } from '@/lib/types';
import type { LocationData } from './location-picker-map';

// Importación dinámica del mapa para no afectar el bundle inicial
const LocationPickerMap = dynamic(() => import('./location-picker-map'), {
    loading: () => <div className="h-[400px] w-full bg-muted animate-pulse flex items-center justify-center">Cargando mapa...</div>,
    ssr: false // Leaflet no funciona en SSR
});

function ReportTheftButton({ ...props }) {
    const { pending } = useFormStatus();
    return <Button type="submit" variant="destructive" className="w-full" disabled={pending} {...props}>{pending ? 'Reportando...' : 'Reportar como Robada'}</Button>;
}

const theftReportSchema = z.object({
    date: z.string().min(1, "La fecha es obligatoria."),
    time: z.string().optional(),
    country: z.string().min(1, "El país es obligatorio."),
    state: z.string().min(1, "El estado/provincia es obligatorio."),
    city: z.string().min(1, "El municipio es obligatorio."),
    zipCode: z.string().optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    location: z.string().min(1, "La ubicación es obligatoria."),
    details: z.string().min(1, "Los detalles son obligatorios."),
    thiefDetails: z.string().optional(),
    contactProfile: z.string().min(1, "El perfil de Instagram o Facebook es obligatorio."),
    reward: z.preprocess(
        (val) => val || undefined,
        z.string()
         .regex(/^[0-9]+$/, { message: "La recompensa solo debe contener números." })
         .optional()
    ),
});

type TheftReportValues = z.infer<typeof theftReportSchema>;

interface TheftReportFormProps {
    bike: Bike;
    onSuccess?: () => void;
    defaultOpen?: boolean;
}

export function TheftReportForm({ bike, onSuccess, defaultOpen = false }: TheftReportFormProps) {
    const [showForm, setShowForm] = useState(defaultOpen);
    const [showMap, setShowMap] = useState(false);
    const [state, formAction] = useActionState(reportTheft, null);
    const { toast } = useToast();
    
    // Estado para la normalización de ubicación
    const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(countries.find(c => c.name === 'México'));
    const [states, setStates] = useState<string[]>(selectedCountry?.states || []);
    const [cities, setCities] = useState<string[]>([]);

    useEffect(() => {
        setShowForm(defaultOpen);
    }, [defaultOpen]);

    const form = useForm<TheftReportValues>({
        resolver: zodResolver(theftReportSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0,5),
            country: 'México',
            state: '',
            city: '',
            zipCode: '',
            lat: undefined,
            lng: undefined,
            location: "",
            details: "",
            thiefDetails: "",
            contactProfile: "",
            reward: "",
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
                setShowForm(false);
                if (onSuccess) onSuccess();
            }
        }
    }, [state, toast, onSuccess]);

    // Lógica de Normalización
    const normalizeLocation = (apiData: LocationData) => {
        const { address, lat, lng } = apiData;
        const apiCountry = address.country || '';
        const apiState = address.state || address.county || ''; // A veces county tiene el dato que buscamos
        const apiCity = address.city || address.suburb || address.town || address.village || '';
        const apiZip = address.postcode || '';
        const apiRoad = address.road ? `${address.road}, ` : '';
        const fullAddress = `${apiRoad}${apiCity}, ${apiState}, ${apiCountry}`;

        // 1. Normalizar País
        const matchedCountry = countries.find(c => 
            c.name.toLowerCase() === apiCountry.toLowerCase() || 
            c.code.toLowerCase() === address.country_code?.toLowerCase()
        );

        if (matchedCountry) {
            form.setValue('country', matchedCountry.name);
            setSelectedCountry(matchedCountry);
            setStates(matchedCountry.states);
            
            // 2. Normalizar Estado
            // Búsqueda difusa simple o exacta
            const matchedState = matchedCountry.states.find(s => 
                apiState.toLowerCase().includes(s.toLowerCase()) || 
                s.toLowerCase().includes(apiState.toLowerCase())
            );

            if (matchedState) {
                form.setValue('state', matchedState);
                const availableCities = getCities(matchedCountry.name, matchedState);
                setCities(availableCities);

                // 3. Normalizar Ciudad (Municipio)
                const matchedCity = availableCities.find(c => 
                    apiCity.toLowerCase().includes(c.toLowerCase()) ||
                    c.toLowerCase().includes(apiCity.toLowerCase())
                );

                if (matchedCity) {
                    form.setValue('city', matchedCity);
                } else {
                    form.setValue('city', ''); // Fallback a manual
                    toast({ title: "Municipio no detectado exactamente", description: "Por favor selecciona tu municipio de la lista.", duration: 4000 });
                }
            } else {
                form.setValue('state', ''); // Fallback a manual
                form.setValue('city', '');
                setCities([]);
                toast({ title: "Estado no detectado", description: "Por favor selecciona el estado y municipio manualmente.", duration: 4000 });
            }
        } else {
            // Fallback total si el país no está soportado o detectado
            toast({ title: "Ubicación fuera de cobertura", description: "Por favor ingresa los datos de ubicación manualmente.", variant: "destructive" });
        }

        // Setear valores directos
        form.setValue('zipCode', apiZip);
        form.setValue('location', fullAddress); // Dirección legible
        form.setValue('lat', lat);
        form.setValue('lng', lng);
    };

    const handleUseCurrentDateTime = () => {
        const now = new Date();
        form.setValue('date', now.toISOString().split('T')[0]);
        form.setValue('time', now.toTimeString().slice(0, 5));
    };

    const handleCountryChange = (countryName: string) => {
        const country = countries.find(c => c.name === countryName);
        setSelectedCountry(country);
        setStates(country ? country.states : []);
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
            setCities(getCities(countryName, stateName));
        }
    };

    const canReportStolen = bike.status === 'safe' || bike.status === 'recovered';

    if (!showForm && canReportStolen) {
        return <Button variant="destructive" className="w-full" onClick={() => setShowForm(true)}>Reportar como Robada</Button>
    }
    
    if (!canReportStolen) return null;

    if (showMap) {
        return (
            <LocationPickerMap 
                onLocationSelect={(data) => {
                    normalizeLocation(data);
                    setShowMap(false);
                }}
                onClose={() => setShowMap(false)}
            />
        );
    }

    return (
        <Form {...form}>
            <form action={formAction} className="space-y-4">
                {state?.message && (
                    <Alert variant={state.errors ? "destructive" : "default"}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{state.errors ? 'Error' : 'Éxito'}</AlertTitle>
                        <AlertDescription>{state.message}</AlertDescription>
                    </Alert>
                )}

                <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={handleUseCurrentDateTime} className="text-xs">
                        <CalendarClock className="w-3 h-3 mr-1" /> Usar fecha y hora actual
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fecha del Robo</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Hora (aprox.)</FormLabel>
                                <FormControl><Input type="time" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="p-4 border rounded-md bg-muted/20 space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm">Ubicación del Incidente</h4>
                        <Button type="button" variant="default" size="sm" onClick={() => setShowMap(true)}>
                            <MapPin className="w-3 h-3 mr-1" /> Seleccionar en Mapa
                        </Button>
                    </div>

                    <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>País</FormLabel>
                                <Select onValueChange={handleCountryChange} value={field.value} name={field.name}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="País" /></SelectTrigger></FormControl>
                                    <SelectContent>{countries.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="state"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estado</FormLabel>
                                    <Select onValueChange={handleStateChange} value={field.value} disabled={!selectedCountry} name={field.name}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger></FormControl>
                                        <SelectContent>{states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
                                    <FormLabel>Municipio</FormLabel>
                                    {cities.length > 0 ? (
                                        <Select onValueChange={field.onChange} value={field.value} disabled={!form.watch('state')} name={field.name}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Municipio" /></SelectTrigger></FormControl>
                                            <SelectContent>{cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                        </Select>
                                    ) : (
                                        <FormControl><Input placeholder="Escribe el municipio" {...field} value={field.value || ''} /></FormControl>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Dirección / Referencia</FormLabel>
                                <FormControl><Input placeholder="Calle, número, cruces..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <input type="hidden" name="zipCode" value={form.watch('zipCode')} />
                    <input type="hidden" name="lat" value={form.watch('lat') || ''} />
                    <input type="hidden" name="lng" value={form.watch('lng') || ''} />
                </div>

                <FormField
                    control={form.control}
                    name="details"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Detalles del robo</FormLabel>
                            <FormControl>
                                <Textarea placeholder="¿Cómo sucedió el robo? Describe la situación..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="thiefDetails"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Detalles del ladrón <span className="text-muted-foreground font-normal">(Opcional - Para definir perfiles)</span></FormLabel>
                            <FormControl>
                                <Textarea placeholder="Descripción física, vestimenta, modus operandi..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="contactProfile"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Perfil de Instagram o Facebook <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                                <Input placeholder="ej. @usuario_bici o facebook.com/juanperez" {...field} />
                            </FormControl>
                            <p className="text-[0.8rem] text-muted-foreground">
                                Importante para que cualquiera pueda darte noticias públicamente.
                            </p>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="reward"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Recompensa (Opcional)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="ej., 500" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                <input type="hidden" name="bikeId" value={bike.id} />
                
                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                    {onSuccess && <Button variant="outline" type="button" onClick={onSuccess}>Cancelar</Button>}
                    <ReportTheftButton />
                </div>
            </form>
        </Form>
    );
}
