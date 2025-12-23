'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { registerForEventAction } from '@/lib/actions/event-registration-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import { Tag, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import type { Event, User, EventRegistration } from '@/lib/types';
import dynamic from 'next/dynamic';

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
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function EventRegistrationCard({ event, user, isRegistered = false, registration, organizerNameForWaiver }: EventRegistrationCardProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isWaiverModalOpen, setIsWaiverModalOpen] = useState(false);
    
    const [selectedTierId, setSelectedTierId] = useState<string | undefined>(undefined);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
    const [marketingConsent, setMarketingConsent] = useState(false);

    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');
    const [bloodType, setBloodType] = useState<string | undefined>(undefined);
    const [insuranceInfo, setInsuranceInfo] = useState('');

    useEffect(() => {
        if (user) {
            if (user.bloodType) setBloodType(user.bloodType);
            if (user.insuranceInfo) setInsuranceInfo(user.insuranceInfo);
        }
    }, [user]);

    const tiers = event.costTiers || [];
    const categories = event.categories || [];
    
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
    
    const price = selectedTier ? selectedTier.price : 0;
    const isFree = event.costType === 'Gratuito' || (tiers.length === 0);

    const handleRegisterClick = () => {
        if (!isFree && tiers.length > 0 && !selectedTierId) {
            toast({ variant: "destructive", title: "Selección requerida", description: "Por favor selecciona un nivel de acceso." });
            return;
        }
        
        if (event.hasCategories && categories.length > 0 && !selectedCategoryId) {
            toast({ variant: "destructive", title: "Selección requerida", description: "Por favor selecciona una categoría." });
            return;
        }

        setIsConfirmModalOpen(true);
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

    const handleProceedToWaiverOrRegister = () => {
        if (!validateEmergencyContact()) return;

        if (event.requiresWaiver) {
            setIsConfirmModalOpen(false);
            setIsWaiverModalOpen(true);
        } else {
            handleFinalRegistration();
        }
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
                marketingConsent
            );
            
            if (result.success) {
                toast({ title: "¡Inscripción Exitosa!", description: "Te has registrado correctamente al evento. Redirigiendo a tu panel..." });
                setIsConfirmModalOpen(false);
                setIsWaiverModalOpen(false);
                router.push(`/dashboard/events/${event.id}`);
            } else {
                toast({ variant: "destructive", title: "Error en el registro", description: result.error || "Ocurrió un error inesperado." });
            }
        });
    };
    
    const eventUrl = `/events/${event.id}`;
    const loginUrl = `/login?callbackUrl=${encodeURIComponent(eventUrl)}`;
    const signupUrl = `/signup?callbackUrl=${encodeURIComponent(eventUrl)}`;

    return (
        <>
        <Card className="shadow-lg sticky top-24 z-10 border-t-4 border-t-secondary">
            <CardHeader className="pb-2">
                <CardTitle className="text-xl">Inscripción</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
                <div className="flex items-center justify-between pb-4 border-b last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Tag className="h-5 w-5" />
                        <span>Costo</span>
                    </div>
                    <span className="font-bold text-xl">
                        {isFree ? 'Gratuito' : (selectedTier ? `$${selectedTier.price} MXN` : 'Desde...')}
                    </span>
                </div>
                
                {user && !isRegistered && !isSoldOut && !isFinished && !isRegistrationClosed && (
                    <div className="space-y-4 animate-in fade-in">
                        {!isFree && tiers.length > 0 && (
                            <div className="space-y-2">
                                <Label>Nivel de Acceso</Label>
                                <Select onValueChange={setSelectedTierId} value={selectedTierId}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona un nivel" /></SelectTrigger>
                                    <SelectContent>
                                        {tiers.map(tier => <SelectItem key={tier.id} value={tier.id}>{tier.name} - ${tier.price}</SelectItem>)}
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
                                {event.status === 'draft' ? 'No disponible' : 'Registrarme Ahora'}
                            </Button>
                        )
                    ) : (
                        <div className="space-y-3">
                            <Button size="lg" variant="outline" className="w-full font-semibold border-primary/50 hover:bg-primary/5" asChild>
                                <Link href={loginUrl}>Iniciar Sesión</Link>
                            </Button>
                            <Button size="lg" className="w-full font-bold shadow-md" asChild>
                                <Link href={signupUrl}>Crear Cuenta</Link>
                            </Button>
                            <p className="text-xs text-center text-muted-foreground mt-2">Para inscribirte al evento necesitas una cuenta.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

        <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Confirmar Inscripción</DialogTitle>
                    <DialogDescription>Revisa los detalles de tu registro antes de continuar.</DialogDescription>
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
                    {event.requiresEmergencyContact && (
                        <div className="space-y-4 pt-3 border-t mt-2">
                            <h4 className="font-semibold text-sm text-destructive">Información de Emergencia (Obligatorio)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="e-name">Nombre de Contacto</Label>
                                    <Input id="e-name" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="Nombre de familiar o amigo" className="h-9" />
                                </div>
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label htmlFor="e-phone">Teléfono</Label>
                                    <Input id="e-phone" type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="10 dígitos" className="h-9" />
                                </div>
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label>Tipo de Sangre</Label>
                                    <Select value={bloodType} onValueChange={setBloodType}>
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                        <SelectContent>
                                            {BLOOD_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="e-insurance">Seguro Médico / Póliza</Label>
                                    <Input id="e-insurance" value={insuranceInfo} onChange={(e) => setInsuranceInfo(e.target.value)} placeholder="Ej. IMSS, GNP - Poliza 12345, o 'Sin seguro'" className="h-9" />
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground italic bg-muted/30 p-2 rounded">* Tus datos médicos solo serán visibles para el organizador durante el evento y hasta 24 horas después.</p>
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
                        {event.requiresWaiver ? "Continuar a Firma" : "Confirmar Registro"}
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
