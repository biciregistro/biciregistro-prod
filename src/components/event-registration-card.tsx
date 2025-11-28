'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { registerForEventAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tag, MapPin, Loader2, ShieldCheck } from 'lucide-react';
import type { Event, User } from '@/lib/types';

interface EventRegistrationCardProps {
    event: Event;
    user: User | null;
    isRegistered?: boolean;
}

export function EventRegistrationCard({ event, user, isRegistered = false }: EventRegistrationCardProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [selectedTierId, setSelectedTierId] = useState<string | undefined>(undefined);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);

    // Emergency Contact State
    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');

    const tiers = event.costTiers || [];
    const categories = event.categories || [];
    
    // Calculate sold out status
    const isSoldOut = (event.maxParticipants || 0) > 0 && (event.currentParticipants || 0) >= (event.maxParticipants || 0);
    
    // Date-dependent status (Calculated on client to avoid hydration mismatch)
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
    
    // Selected Data for Modal
    const selectedTier = tiers.find(t => t.id === selectedTierId);
    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    
    const price = selectedTier ? selectedTier.price : 0;
    const isFree = event.costType === 'Gratuito' || (tiers.length === 0);

    const handleRegisterClick = () => {
        // Validations
        if (!isFree && tiers.length > 0 && !selectedTierId) {
            toast({
                variant: "destructive",
                title: "Selección requerida",
                description: "Por favor selecciona un nivel de acceso.",
            });
            return;
        }
        
        if (event.hasCategories && categories.length > 0 && !selectedCategoryId) {
            toast({
                variant: "destructive",
                title: "Selección requerida",
                description: "Por favor selecciona una categoría.",
            });
            return;
        }

        setIsModalOpen(true);
    };

    const handleConfirmRegistration = async () => {
        if (event.requiresEmergencyContact) {
            if (!emergencyName.trim() || !emergencyPhone.trim()) {
                toast({
                    variant: "destructive",
                    title: "Datos incompletos",
                    description: "Debes completar la información de contacto de emergencia.",
                });
                return;
            }
        }

        startTransition(async () => {
            const result = await registerForEventAction(
                event.id, 
                selectedTierId, 
                selectedCategoryId,
                emergencyName,
                emergencyPhone
            );
            
            if (result.success) {
                toast({
                    title: "¡Inscripción Exitosa!",
                    description: "Te has registrado correctamente al evento.",
                });
                setIsModalOpen(false);
                // Redirect to the dashboard events tab
                router.push('/dashboard?tab=events');
            } else {
                toast({
                    variant: "destructive",
                    title: "Error en el registro",
                    description: result.error || "Ocurrió un error inesperado.",
                });
            }
        });
    };

    // Callback URLs for unauthenticated users
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
                
                {/* Status Indicators */}
                <div className="flex items-center justify-between pb-4 border-b last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Tag className="h-5 w-5" />
                        <span>Costo</span>
                    </div>
                    <span className="font-bold text-xl">
                        {isFree ? 'Gratuito' : (selectedTier ? `$${selectedTier.price} MXN` : 'Desde...')}
                    </span>
                </div>
                
                {/* Selection Logic (Only for logged in users not yet registered) */}
                {user && !isRegistered && !isSoldOut && !isFinished && !isRegistrationClosed && (
                    <div className="space-y-4 animate-in fade-in">
                        {!isFree && tiers.length > 0 && (
                            <div className="space-y-2">
                                <Label>Nivel de Acceso</Label>
                                <Select onValueChange={setSelectedTierId} value={selectedTierId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un nivel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tiers.map(tier => (
                                            <SelectItem key={tier.id} value={tier.id}>
                                                {tier.name} - ${tier.price}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {event.hasCategories && categories.length > 0 && (
                             <div className="space-y-2">
                                <Label>Categoría</Label>
                                <Select onValueChange={setSelectedCategoryId} value={selectedCategoryId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona tu categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                )}

                <div className="pt-2">
                    {isClient && isFinished ? (
                        <Button size="lg" variant="secondary" className="w-full text-lg font-bold h-12 bg-gray-100 text-gray-600" disabled>
                            Evento Finalizado
                        </Button>
                    ) : isClient && isRegistrationClosed ? (
                         <Button size="lg" variant="secondary" className="w-full text-lg font-bold h-12 bg-orange-100 text-orange-800" disabled>
                            Inscripciones Cerradas
                        </Button>
                    ) : user ? (
                        isRegistered ? (
                             <Button size="lg" variant="secondary" className="w-full text-lg font-bold h-12 bg-green-100 text-green-800 hover:bg-green-200" disabled>
                                ¡Ya estás inscrito!
                            </Button>
                        ) : isSoldOut ? (
                             <Button size="lg" variant="destructive" className="w-full text-lg font-bold h-12" disabled>
                                Cupo Lleno (Sold Out)
                            </Button>
                        ) : (
                            <Button 
                                size="lg" 
                                className="w-full text-lg font-bold shadow-lg shadow-primary/20 h-12" 
                                disabled={event.status === 'draft' || isPending}
                                onClick={handleRegisterClick}
                            >
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
                            <p className="text-xs text-center text-muted-foreground mt-2">
                                Para inscribirte al evento necesitas una cuenta en BiciRegistro.
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Confirmar Inscripción</DialogTitle>
                    <DialogDescription>
                        Revisa los detalles de tu registro antes de confirmar.
                    </DialogDescription>
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

                    {/* Emergency Contact Form Section */}
                    {event.requiresEmergencyContact && (
                        <div className="space-y-3 pt-3 border-t mt-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2 text-destructive">
                                Contacto de Emergencia (Obligatorio)
                            </h4>
                            <div className="grid gap-2">
                                <Label htmlFor="e-name">Nombre Completo</Label>
                                <Input 
                                    id="e-name" 
                                    value={emergencyName} 
                                    onChange={(e) => setEmergencyName(e.target.value)} 
                                    placeholder="Nombre de familiar o amigo"
                                    className="h-9"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="e-phone">Teléfono</Label>
                                <Input 
                                    id="e-phone" 
                                    type="tel"
                                    value={emergencyPhone} 
                                    onChange={(e) => setEmergencyPhone(e.target.value)} 
                                    placeholder="10 dígitos"
                                    className="h-9"
                                />
                            </div>
                        </div>
                    )}

                    {/* Financial Breakdown (Scenario 4) */}
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
                        <span className="font-bold text-xl text-primary">
                            {isFree ? 'Gratuito' : `$${price} MXN`}
                        </span>
                    </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirmRegistration} disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Confirmar Registro
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
