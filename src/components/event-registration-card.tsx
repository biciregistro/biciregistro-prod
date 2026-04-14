'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { registerForEventAction, updateBaseProfileInRegistrationAction } from '@/lib/actions/event-registration-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tag, Loader2, ShieldCheck, ArrowRight, Shirt, HelpCircle, User as UserIcon } from 'lucide-react';
import type { Event, User, EventRegistration } from '@/lib/types';
import dynamic from 'next/dynamic';

// Import helpers for location selects
import { countries, type Country } from '@/lib/countries';
import { getCities } from '@/lib/cities';

const WaiverModal = dynamic(() => import('@/components/waiver-modal').then(mod => mod.WaiverModal), {
    ssr: false,
    loading: () => null
});

interface EventRegistrationCardProps {
    event: Event;
    user: User | null;
    isRegistered?: boolean;
    registration?: EventRegistration | null;
    organizerNameForWaiver?: string;
    organizerName?: string; 
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function EventRegistrationCard({ event, user, isRegistered = false, registration, organizerNameForWaiver, organizerName }: EventRegistrationCardProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isWaiverModalOpen, setIsWaiverModalOpen] = useState(false);
    
    const [selectedTierId, setSelectedTierId] = useState<string | undefined>(undefined);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
    
    // Jersey Selection State
    const [selectedJerseyId, setSelectedJerseyId] = useState<string | undefined>(undefined);
    const [selectedJerseySize, setSelectedJerseySize] = useState<string | undefined>(undefined);

    // Custom Answers State
    const [customAnswers, setCustomAnswers] = useState<Record<string, string | string[]>>({});

    const [marketingConsent, setMarketingConsent] = useState(false);

    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');
    const [bloodType, setBloodType] = useState<string | undefined>(undefined);
    const [insuranceInfo, setInsuranceInfo] = useState('');
    const [allergies, setAllergies] = useState('');

    // Profile State (For on-the-fly onboarding)
    const [needsProfileUpdate, setNeedsProfileUpdate] = useState(false);
    const [profilePhone, setProfilePhone] = useState('');
    const [profileBirthDate, setProfileBirthDate] = useState('');
    const [profileGender, setProfileGender] = useState<'masculino' | 'femenino' | 'otro' | undefined>(undefined);
    
    const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(countries.find(c => c.name === 'México'));
    const [profileCountryName, setProfileCountryName] = useState('México');
    const [states, setStates] = useState<string[]>(selectedCountry?.states || []);
    const [profileStateName, setProfileStateName] = useState('');
    const [cities, setCities] = useState<string[]>([]);
    const [profileCityName, setProfileCityName] = useState('');

    useEffect(() => {
        if (user) {
            if (user.bloodType) setBloodType(user.bloodType);
            if (user.insuranceInfo) setInsuranceInfo(user.insuranceInfo);
            if (user.allergies) setAllergies(user.allergies);
            // Pre-fill emergency contact info if available in profile
            if (user.emergencyContactName) setEmergencyName(user.emergencyContactName);
            if (user.emergencyContactPhone) setEmergencyPhone(user.emergencyContactPhone);

            // Check if profile is complete
            const userPhone = user.phone || user.whatsapp;
            const isComplete = !!(userPhone && user.gender && user.birthDate && user.city && user.state && user.country);
            
            if (!isComplete) {
                setNeedsProfileUpdate(true);
                // Pre-fill whatever exists
                if (userPhone) setProfilePhone(userPhone);
                if (user.gender) setProfileGender(user.gender);
                
                // Format birthdate for display DD/MM/YYYY
                if (user.birthDate) {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(user.birthDate)) {
                        const [y, m, d] = user.birthDate.split('-');
                        setProfileBirthDate(`${d}/${m}/${y}`);
                    } else {
                        setProfileBirthDate(user.birthDate);
                    }
                }
                
                if (user.country) handleCountryChange(user.country);
                if (user.state) {
                     setProfileStateName(user.state);
                     if (user.country) {
                         const availableCities = getCities(user.country, user.state);
                         setCities(availableCities);
                     }
                }
                if (user.city) setProfileCityName(user.city);
            } else {
                setNeedsProfileUpdate(false);
            }
        }
    }, [user]);

    const handleCountryChange = (countryName: string) => {
        const country = countries.find(c => c.name === countryName);
        setSelectedCountry(country);
        setStates(country?.states || []);
        setCities([]);
        setProfileCountryName(countryName);
        setProfileStateName(''); 
        setProfileCityName('');
    };

    const handleStateChange = (stateName: string) => {
        setProfileStateName(stateName);
        setProfileCityName('');
        if (profileCountryName) {
            const availableCities = getCities(profileCountryName, stateName);
            setCities(availableCities);
        } else {
            setCities([]);
        }
    };

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
        setProfileBirthDate(formattedValue);
    };

    // Reset jersey size if model changes
    useEffect(() => {
        setSelectedJerseySize(undefined);
    }, [selectedJerseyId]);

    const tiers = event.costTiers || [];
    const categories = event.categories || [];
    const jerseyConfigs = event.jerseyConfigs || [];
    const hasJersey = event.hasJersey && jerseyConfigs.length > 0;
    const customQuestions = event.customQuestions || [];
    
    const isSoldOut = (event.maxParticipants || 0) > 0 && (event.currentParticipants || 0) >= (event.maxParticipants || 0);
    
    const [isFinished, setIsFinished] = useState(false);
    const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const now = new Date();
        setIsFinished(new Date(event.date) < now);
        
        if (event.hasRegistrationDeadline && event.registrationDeadline) {
            setIsRegistrationClosed(new Date(event.registrationDeadline) < now);
        }
    }, [event.date, event.hasRegistrationDeadline, event.registrationDeadline]);
    
    const selectedTier = tiers.find(t => t.id === selectedTierId);
    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    const selectedJerseyConfig = jerseyConfigs.find(j => j.id === selectedJerseyId);
    
    const price = selectedTier ? selectedTier.price : 0;
    const isFree = event.costType === 'Gratuito' || (tiers.length === 0) || (selectedTier?.price === 0);

    // Handle Checkbox Change
    const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
        setCustomAnswers(prev => {
            const current = (prev[questionId] as string[]) || [];
            if (checked) {
                return { ...prev, [questionId]: [...current, option] };
            } else {
                return { ...prev, [questionId]: current.filter(item => item !== option) };
            }
        });
    };

    const handleRegisterClick = () => {
        if (event.costType !== 'Gratuito' && tiers.length > 0 && !selectedTierId) {
            toast({ variant: "destructive", title: "Selección requerida", description: "Por favor selecciona un nivel de acceso." });
            return;
        }
        
        if (event.hasCategories && categories.length > 0 && !selectedCategoryId) {
            toast({ variant: "destructive", title: "Selección requerida", description: "Por favor selecciona una categoría." });
            return;
        }

        if (hasJersey) {
            if (!selectedJerseyId) {
                toast({ variant: "destructive", title: "Selección requerida", description: "Por favor selecciona un modelo de Jersey." });
                return;
            }
            if (!selectedJerseySize) {
                toast({ variant: "destructive", title: "Selección requerida", description: "Por favor selecciona una talla de Jersey." });
                return;
            }
        }

        setIsConfirmModalOpen(true);
    };

    const validateProfileFields = () => {
        if (needsProfileUpdate) {
            if (!profilePhone || profilePhone.length < 10) {
                toast({ variant: "destructive", title: "Datos incompletos", description: "Debes ingresar un número de teléfono válido." });
                return false;
            }
            if (!profileBirthDate || profileBirthDate.length < 10) {
                toast({ variant: "destructive", title: "Datos incompletos", description: "Debes ingresar tu fecha de nacimiento (DD/MM/AAAA)." });
                return false;
            }
            if (!profileGender) {
                toast({ variant: "destructive", title: "Datos incompletos", description: "Por favor selecciona tu género." });
                return false;
            }
            if (!profileCountryName || !profileStateName || !profileCityName) {
                toast({ variant: "destructive", title: "Ubicación incompleta", description: "Por favor selecciona tu país, estado y municipio." });
                return false;
            }
        }
        return true;
    };

    const validateEmergencyContact = () => {
        if (event.requiresEmergencyContact) {
            if (!emergencyName.trim() || !emergencyPhone.trim()) {
                toast({ variant: "destructive", title: "Datos incompletos", description: "Debes completar la información de contacto de emergencia." });
                return false;
            }
            if (!bloodType) {
                toast({ variant: "destructive", title: "Datos incompletos", description: "Por favor selecciona tu tipo de sangre." });
                return false;
            }
            if (!insuranceInfo.trim()) {
                toast({ variant: "destructive", title: "Datos incompletos", description: "Ingresa tu seguro médico o escribe 'Sin seguro'." });
                return false;
            }
        }
        return true;
    };

    const validateCustomQuestions = () => {
        for (const q of customQuestions) {
            if (q.required) {
                const answer = customAnswers[q.id];
                if (!answer || (Array.isArray(answer) && answer.length === 0) || (typeof answer === 'string' && !answer.trim())) {
                    toast({ 
                        variant: "destructive", 
                        title: "Pregunta obligatoria", 
                        description: `Por favor responde: ${q.label}` 
                    });
                    return false;
                }
            }
        }
        return true;
    };

    const handleProceedToWaiverOrRegister = async () => {
        if (!validateProfileFields()) return;
        if (!validateEmergencyContact()) return;
        if (!validateCustomQuestions()) return;

        startTransition(async () => {
            // Si el perfil está incompleto, guardamos primero esos datos básicos
            if (needsProfileUpdate) {
                const profileUpdateResult = await updateBaseProfileInRegistrationAction(
                    profileBirthDate,
                    profileGender!,
                    profileCountryName,
                    profileStateName,
                    profileCityName,
                    profilePhone
                );
                
                if (!profileUpdateResult.success) {
                    toast({ variant: "destructive", title: "Error", description: profileUpdateResult.error || "No se pudieron guardar tus datos de corredor." });
                    return; // Stop execution if profile update fails
                }
            }

            // Si todo salió bien, continuar flujo normal
            if (event.requiresWaiver) {
                setIsConfirmModalOpen(false);
                setIsWaiverModalOpen(true);
            } else {
                handleFinalRegistration();
            }
        });
    };

    const handleFinalRegistration = async (waiverData?: { signature: string, signedText: string }) => {
        startTransition(async () => {
            const result = await registerForEventAction(
                event.id, 
                selectedTierId, 
                selectedCategoryId,
                emergencyName,
                emergencyPhone,
                bloodType,
                insuranceInfo,
                waiverData?.signature,
                waiverData ? new Date().toISOString() : undefined,
                waiverData?.signedText,
                marketingConsent,
                selectedJerseyConfig?.name,
                selectedJerseySize,
                allergies,
                customAnswers
            );
            
            if (result.success) {
                // If points are awarded, the destination page will handle the toast/confetti via GamificationListener.
                // We avoid showing a toast here to prevent conflicts and "Max update depth" errors.
                if (!result.pointsAwarded) {
                    toast({ title: "¡Inscripción Exitosa!", description: "Te has registrado correctamente al evento." });
                }
                
                setIsConfirmModalOpen(false);
                setIsWaiverModalOpen(false);
                
                let url = `/dashboard/events/${event.id}`;
                if (result.pointsAwarded) {
                    url += `?points=30&action_type=event_join`;
                }
                
                // Delay redirection slightly to allow state updates to settle
                // and avoid race conditions with unmounting components
                setTimeout(() => {
                    router.push(url);
                }, 100);

            } else {
                toast({ variant: "destructive", title: "Error en el registro", description: result.error || "Ocurrió un error inesperado." });
            }
        });
    };
    
    const eventUrlWithAnchor = `/events/${event.id}#registration-section`;
    const loginUrl = `/login?callbackUrl=${encodeURIComponent(eventUrlWithAnchor)}`;
    const signupUrl = `/signup?callbackUrl=${encodeURIComponent(eventUrlWithAnchor)}`;

    const checkTierAvailability = (tier: any) => {
        if (!tier.limit || tier.limit === 0) return { available: true };
        const sold = tier.soldCount || 0;
        return { 
            available: sold < tier.limit,
            remaining: tier.limit - sold
        };
    };

    return (
        <>
        <Card className="shadow-lg sticky top-24 z-10 border-t-4 border-t-secondary overflow-hidden">
            <CardHeader className="pb-3 bg-muted/10">
                <div className="space-y-2">
                    <CardTitle className="text-xl">Regístrate al evento</CardTitle>
                    <p className="text-[11px] text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-top-1">
                        Este evento de <span className="font-semibold text-foreground">{organizerName || 'el organizador'}</span> está comprometido con la protección de tu bici. Tu acceso incluye el respaldo de Biciregistro para blindarte contra el robo y el mercado negro.
                    </p>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
                <div className="flex items-center justify-between pb-4 border-b last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Tag className="h-5 w-5" />
                        <span>Costo</span>
                    </div>
                    <span className="font-bold text-xl">
                        {event.costType === 'Gratuito' ? 'Gratuito' : (selectedTier ? (selectedTier.price === 0 ? 'Gratis' : `$${selectedTier.price} MXN`) : 'Selecciona...')}
                    </span>
                </div>
                
                {user && !isRegistered && !isSoldOut && !isFinished && !isRegistrationClosed && (
                    <div className="space-y-4 animate-in fade-in">
                        {event.costType !== 'Gratuito' && tiers.length > 0 && (
                            <div className="space-y-2">
                                <Label>Nivel de Acceso</Label>
                                <Select onValueChange={setSelectedTierId} value={selectedTierId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un nivel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tiers.map(tier => {
                                            const { available, remaining } = checkTierAvailability(tier);
                                            return (
                                                <SelectItem 
                                                    key={tier.id} 
                                                    value={tier.id} 
                                                    disabled={!available}
                                                    className={!available ? "opacity-50" : ""}
                                                >
                                                    <span className="flex items-center justify-between w-full gap-2">
                                                        <span>{tier.name} - {tier.price === 0 ? 'Gratis' : `$${tier.price}`}</span>
                                                        {!available && <span className="text-xs font-bold text-destructive ml-2">(Agotado)</span>}
                                                        {available && remaining !== undefined && remaining <= 5 && (
                                                            <span className="text-xs font-bold text-orange-500 ml-2">({remaining} libres)</span>
                                                        )}
                                                    </span>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {event.hasCategories && categories.length > 0 && (
                             <div className="space-y-2">
                                <Label>Categoría</Label>
                                <Select onValueChange={setSelectedCategoryId} value={selectedCategoryId}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona tu categoría" /></SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {hasJersey && (
                             <div className="space-y-3 bg-muted/20 p-3 rounded-md border border-dashed border-primary/20">
                                <div className="flex items-center gap-2 mb-1">
                                    <Shirt className="h-4 w-4 text-primary" />
                                    <Label className="text-primary font-semibold">Selección de Jersey</Label>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs">Modelo</Label>
                                    <Select onValueChange={setSelectedJerseyId} value={selectedJerseyId}>
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Elige el modelo" /></SelectTrigger>
                                        <SelectContent>
                                            {jerseyConfigs.map(j => <SelectItem key={j.id} value={j.id}>{j.name} ({j.type})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedJerseyId && selectedJerseyConfig && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                        <Label className="text-xs">Talla</Label>
                                        <Select onValueChange={setSelectedJerseySize} value={selectedJerseySize}>
                                            <SelectTrigger className="h-9"><SelectValue placeholder="Elige tu talla" /></SelectTrigger>
                                            <SelectContent>
                                                {selectedJerseyConfig.sizes.map(size => (
                                                    <SelectItem key={size} value={size}>{size}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="pt-2">
                    {isClient && isFinished ? (
                        <Button size="lg" variant="secondary" className="w-full text-lg font-bold h-12 bg-gray-100 text-gray-600" disabled>Evento Finalizado</Button>
                    ) : isClient && isRegistrationClosed ? (
                         <Button size="lg" variant="secondary" className="w-full text-lg font-bold h-12 bg-orange-100 text-orange-800" disabled>Inscripciones Cerradas</Button>
                    ) : user ? (
                        isRegistered ? (
                            <div className="space-y-3">
                                <Button size="lg" variant="secondary" className="w-full text-lg font-bold h-12 bg-green-100 text-green-800 hover:bg-green-200" disabled>¡Ya estás inscrito!</Button>
                                <Button size="lg" className="w-full text-lg font-bold h-12" onClick={() => router.push(`/dashboard/events/${event.id}`)}>
                                    Gestionar mi Inscripción <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </div>
                        ) : isSoldOut ? (
                             <Button size="lg" variant="destructive" className="w-full text-lg font-bold h-12" disabled>Cupo Lleno (Sold Out)</Button>
                        ) : (
                            <Button size="lg" className="w-full text-lg font-bold shadow-lg shadow-primary/20 h-12" disabled={event.status === 'draft' || isPending} onClick={handleRegisterClick}>
                                {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                                {event.status === 'draft' ? 'No disponible' : (isFree ? 'Registrarme Gratis' : 'Pagar e Inscribirme')}
                            </Button>
                        )
                    ) : (
                        <div className="space-y-3">
                            <Button size="lg" className="w-full font-bold shadow-md bg-blue-600 hover:bg-blue-700 text-white" asChild>
                                <Link href={signupUrl}>¡Regístrate ahora!</Link>
                            </Button>
                            <Button size="lg" variant="outline" className="w-full font-medium border-muted-foreground/30 text-muted-foreground hover:bg-muted/10 text-xs sm:text-sm h-auto py-2 whitespace-normal" asChild>
                                <Link href={loginUrl}>Registrarme con mi cuenta de Biciregistro</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

        <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
            {/* REMOVED INLINE Z-INDEX: The root cause of the "ghost" select bug is fixed globally in `src/components/ui/select.tsx`  */}
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Confirmar Inscripción</DialogTitle>
                    <DialogDescription>Completa los detalles finales para asegurar tu lugar.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-3 items-center gap-4">
                        <span className="font-semibold text-sm text-muted-foreground">Evento:</span>
                        <span className="col-span-2 font-medium">{event.name}</span>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                        <span className="font-semibold text-sm text-muted-foreground">Participante:</span>
                        <span className="col-span-2 font-medium">{user?.name} {user?.lastName}</span>
                    </div>
                    {selectedTier && (
                         <div className="grid grid-cols-3 items-center gap-4">
                            <span className="font-semibold text-sm text-muted-foreground">Nivel:</span>
                            <span className="col-span-2 font-medium">{selectedTier.name}</span>
                        </div>
                    )}
                    {selectedCategory && (
                         <div className="grid grid-cols-3 items-center gap-4">
                            <span className="font-semibold text-sm text-muted-foreground">Categoría:</span>
                            <span className="col-span-2 font-medium">{selectedCategory.name}</span>
                        </div>
                    )}
                    
                    {hasJersey && selectedJerseyConfig && selectedJerseySize && (
                        <div className="grid grid-cols-3 items-center gap-4 bg-muted/20 p-2 rounded">
                            <span className="font-semibold text-sm text-muted-foreground flex items-center gap-1">
                                <Shirt className="h-3 w-3" /> Jersey:
                            </span>
                            <span className="col-span-2 font-medium text-sm">
                                {selectedJerseyConfig.name} - Talla {selectedJerseySize}
                            </span>
                        </div>
                    )}

                    {/* NUEVO: Missing Profile Data Injected Here */}
                    {needsProfileUpdate && (
                        <div className="space-y-4 pt-4 border-t border-dashed border-primary/30">
                            <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                                <UserIcon className="h-4 w-4" /> Datos de Corredor (Obligatorio)
                            </h4>
                            <p className="text-xs text-muted-foreground mb-2">Para proteger tu identidad y validar tu asistencia, el organizador requiere estos datos básicos.</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-1">
                                    <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Fecha de Nacimiento</Label>
                                    <Input type="text" inputMode="numeric" placeholder="DD/MM/AAAA" value={profileBirthDate} onChange={handleDateChange} className="h-9" />
                                </div>
                                <div className="space-y-2 col-span-1">
                                    <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Género</Label>
                                    {/* Cambiado de <Select> a <RadioGroup> para igualar ProfileForm y resolver el bug #2 */}
                                    <RadioGroup 
                                        onValueChange={(val: any) => setProfileGender(val)} 
                                        value={profileGender} 
                                        className="flex flex-row space-x-2 pt-1"
                                    >
                                        <div className="flex items-center space-x-1">
                                            <RadioGroupItem value="masculino" id="g-m" />
                                            <Label htmlFor="g-m" className="font-normal text-sm">M</Label>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <RadioGroupItem value="femenino" id="g-f" />
                                            <Label htmlFor="g-f" className="font-normal text-sm">F</Label>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <RadioGroupItem value="otro" id="g-o" />
                                            <Label htmlFor="g-o" className="font-normal text-sm">Otro</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                <div className="space-y-2 col-span-1">
                                    <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">País</Label>
                                    <Select onValueChange={handleCountryChange} value={profileCountryName}>
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecciona país" /></SelectTrigger>
                                        <SelectContent>
                                            {countries.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 col-span-1">
                                    <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Estado</Label>
                                    <Select onValueChange={handleStateChange} value={profileStateName} disabled={!selectedCountry}>
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
                                        <SelectContent>
                                            {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 col-span-1 sm:col-span-2">
                                    <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Municipio</Label>
                                    {cities.length > 0 ? (
                                        <Select onValueChange={setProfileCityName} value={profileCityName} disabled={!profileStateName}>
                                            <SelectTrigger className="h-9"><SelectValue placeholder="Municipio" /></SelectTrigger>
                                            <SelectContent>
                                                {cities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input value={profileCityName} onChange={(e) => setProfileCityName(e.target.value)} placeholder="Tu municipio" className="h-9" />
                                    )}
                                </div>
                                <div className="space-y-2 col-span-1 sm:col-span-2">
                                    <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Teléfono / WhatsApp</Label>
                                    <Input type="tel" placeholder="10 dígitos" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} className="h-9" />
                                </div>
                            </div>
                        </div>
                    )}

                    {event.requiresEmergencyContact && (
                        <div className="space-y-4 pt-4 border-t mt-2">
                            <h4 className="font-semibold text-sm text-destructive">Información de Emergencia (Obligatorio)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="e-name" className="after:content-['*'] after:ml-0.5 after:text-red-500">Nombre de Contacto</Label>
                                    <Input id="e-name" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="Nombre de familiar o amigo" className="h-9" />
                                </div>
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label htmlFor="e-phone" className="after:content-['*'] after:ml-0.5 after:text-red-500">Teléfono</Label>
                                    <Input id="e-phone" type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="10 dígitos" className="h-9" />
                                </div>
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Tipo de Sangre</Label>
                                    <Select value={bloodType} onValueChange={setBloodType}>
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                        <SelectContent>
                                            {BLOOD_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="e-insurance" className="after:content-['*'] after:ml-0.5 after:text-red-500">Seguro Médico / Póliza</Label>
                                    <Input id="e-insurance" value={insuranceInfo} onChange={(e) => setInsuranceInfo(e.target.value)} placeholder="Ej. IMSS, GNP - Poliza 12345, o 'Sin seguro'" className="h-9" />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="e-allergies">Alergias (Opcional)</Label>
                                    <Input id="e-allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Ej. Penicilina, látex, o 'Ninguna'" className="h-9" />
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground italic bg-muted/30 p-2 rounded">* Tus datos médicos solo serán visibles para el organizador durante el evento y hasta 24 horas después.</p>
                        </div>
                    )}

                    {customQuestions.length > 0 && (
                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <HelpCircle className="h-4 w-4" /> Preguntas Adicionales
                            </h4>
                            {customQuestions.map(q => (
                                <div key={q.id} className="space-y-2">
                                    <Label className={q.required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ""}>
                                        {q.label}
                                    </Label>
                                    
                                    {q.type === 'text' && (
                                        <Input 
                                            value={(customAnswers[q.id] as string) || ''}
                                            onChange={(e) => setCustomAnswers({...customAnswers, [q.id]: e.target.value})}
                                            placeholder="Escribe tu respuesta..."
                                            className="h-9"
                                        />
                                    )}

                                    {q.type === 'radio' && q.options && (
                                        <RadioGroup 
                                            value={(customAnswers[q.id] as string) || ''}
                                            onValueChange={(val) => setCustomAnswers({...customAnswers, [q.id]: val})}
                                        >
                                            {q.options.map((opt, idx) => (
                                                <div key={idx} className="flex items-center space-x-2">
                                                    <RadioGroupItem value={opt} id={`q-${q.id}-${idx}`} />
                                                    <Label htmlFor={`q-${q.id}-${idx}`} className="font-normal text-sm">{opt}</Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    )}

                                    {q.type === 'checkbox' && q.options && (
                                        <div className="space-y-2">
                                            {q.options.map((opt, idx) => (
                                                <div key={idx} className="flex items-center space-x-2">
                                                    <Checkbox 
                                                        id={`q-${q.id}-${idx}`} 
                                                        checked={((customAnswers[q.id] as string[]) || []).includes(opt)}
                                                        onCheckedChange={(checked) => handleCheckboxChange(q.id, opt, !!checked)}
                                                    />
                                                    <Label htmlFor={`q-${q.id}-${idx}`} className="font-normal text-sm">{opt}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="border-t pt-4 mt-4 space-y-3">
                        <div className="flex items-start space-x-3">
                            <Checkbox id="marketing-consent" checked={marketingConsent} onCheckedChange={(checked) => setMarketingConsent(!!checked)} />
                            <div className="grid gap-1.5 leading-none">
                                <label htmlFor="marketing-consent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Quiero recibir descuentos exclusivos, regalos y promociones de los Patrocinadores Oficiales del evento.
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    Al marcar esta casilla, aceptas que tus datos de contacto sean transferidos a las marcas aliadas conforme a la sección de Transferencias de nuestro Aviso de Privacidad.
                                </p>
                            </div>
                        </div>
                    </div>

                    {!isFree && selectedTier && (
                        <div className="border-t pt-3 mt-3 space-y-2 bg-muted/20 p-3 rounded-md">
                            {selectedTier.absorbFee ? (
                                <div className="flex justify-between text-sm items-center font-medium">
                                    <span className="text-muted-foreground">Inscripción (Cargos incluidos):</span>
                                    <span>${selectedTier.price.toFixed(2)}</span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between text-sm items-center">
                                        <span className="text-muted-foreground">Inscripción Evento:</span>
                                        <span>${(selectedTier.netPrice ?? selectedTier.price).toFixed(2)}</span>
                                    </div>
                                    {(selectedTier.fee || (selectedTier.netPrice && selectedTier.price > selectedTier.netPrice)) && (
                                        <div className="flex justify-between text-sm items-center">
                                            <span className="text-muted-foreground flex items-center gap-1.5">
                                                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                                                <span>Gestión y Protección Digital</span>
                                            </span>
                                            <span>${(selectedTier.fee ?? (selectedTier.price - (selectedTier.netPrice ?? 0))).toFixed(2)}</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                    <div className="border-t pt-4 mt-2 flex justify-between items-center">
                        <span className="font-bold text-lg">Total a Pagar:</span>
                        <span className="font-bold text-xl text-primary">{isFree ? 'Gratuito' : `$${price} MXN`}</span>
                    </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)} disabled={isPending}>Cancelar</Button>
                    <Button onClick={handleProceedToWaiverOrRegister} disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {event.requiresWaiver ? "Continuar a Firma" : (isFree ? "Confirmar Registro" : "Ir a Pagar")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {user && event.requiresWaiver && event.waiverText && isWaiverModalOpen && (
            <WaiverModal 
                isOpen={isWaiverModalOpen}
                onClose={() => setIsWaiverModalOpen(false)}
                onConfirm={(signature, signedText) => handleFinalRegistration({ signature, signedText })}
                waiverText={event.waiverText}
                participantName={`${user.name} ${user.lastName}`}
                eventName={event.name}
                organizerName={organizerNameForWaiver || "El Organizador"}
                isPending={isPending}
            />
        )}
        </>
    );
}
