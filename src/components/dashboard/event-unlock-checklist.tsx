'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, CheckCircle2, ChevronDown, ShieldAlert, AlertTriangle, Lock, Bike as BikeIcon } from 'lucide-react';
import { SimpleBikeForm } from '@/components/widget/simple-bike-form';
import { ProfileForm } from '@/components/user-components';
import { EventBikeSelector } from '@/components/dashboard/event-bike-selector';
import { cn } from '@/lib/utils';
import type { Bike, EventRegistration } from '@/lib/types';

interface EventUnlockChecklistProps {
    user: any;
    isProfileComplete: boolean;
    needsBike: boolean;
    hasBike: boolean;
    userBikes: Bike[];
    registration: EventRegistration;
    eventId: string;
}

export function EventUnlockChecklist({
    user,
    isProfileComplete,
    needsBike,
    hasBike,
    userBikes,
    registration,
    eventId
}: EventUnlockChecklistProps) {
    const router = useRouter();
    // Expand the first missing requirement automatically
    const [expandedCard, setExpandedCard] = useState<'profile' | 'bike' | null>(
        !isProfileComplete ? 'profile' : (needsBike && (!hasBike || !registration.bikeId) ? 'bike' : null)
    );

    const handleProfileSuccess = () => {
        // Once profile is complete, expand bike if needed, else close.
        setExpandedCard((needsBike && (!hasBike || !registration.bikeId)) ? 'bike' : null);
        router.refresh();
    };

    const handleBikeSuccess = () => {
        setExpandedCard(null);
        router.refresh();
    };

    const isBikeComplete = !needsBike || (hasBike && !!registration.bikeId);

    if (isProfileComplete && isBikeComplete) return null; // Defensive check, should not render if all complete

    return (
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-2 border-primary/20 shadow-lg bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
                <CardHeader className="bg-slate-100/50 dark:bg-slate-800/50 border-b">
                    <CardTitle className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-primary" />
                        Check-in Incompleto
                    </CardTitle>
                    <CardDescription>
                        Completa los siguientes pasos obligatorios liberar tu Acceso al Evento y proteger tu bicicleta.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    
                    {/* PROFILE CARD */}
                    {!isProfileComplete && (
                        <div className={cn("border rounded-xl overflow-hidden transition-all", isProfileComplete ? "bg-green-50/50 border-green-200" : "bg-white dark:bg-slate-950")}>
                            <div 
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
                                onClick={() => setExpandedCard(expandedCard === 'profile' ? null : 'profile')}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-full", isProfileComplete ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-500")}>
                                        {isProfileComplete ? <CheckCircle2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">Datos de Seguridad del Corredor</h4>
                                        <p className="text-xs text-muted-foreground">Información médica y contacto de emergencia</p>
                                    </div>
                                </div>
                                {!isProfileComplete && (
                                    <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", expandedCard === 'profile' && "rotate-180")} />
                                )}
                            </div>
                            
                            {expandedCard === 'profile' && !isProfileComplete && (
                                <div className="p-4 pt-0 border-t bg-slate-50/50 dark:bg-slate-900/50">
                                    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg mb-4 text-xs flex items-start gap-2 mt-4">
                                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                                        <p>Tus datos médicos solo serán compartidos temporalmente con el organizador para salvaguardar tu integridad física.</p>
                                    </div>
                                    <ProfileForm user={user} onSuccess={handleProfileSuccess} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* BIKE CARD */}
                    {needsBike && (
                        <div className={cn("border rounded-xl overflow-hidden transition-all", isBikeComplete ? "bg-green-50/50 border-green-200" : "bg-white dark:bg-slate-950")}>
                            <div 
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
                                onClick={() => !isBikeComplete && setExpandedCard(expandedCard === 'bike' ? null : 'bike')}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-full", isBikeComplete ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600")}>
                                        {isBikeComplete ? <CheckCircle2 className="w-5 h-5" /> : <BikeIcon className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">Bicicleta Blindada</h4>
                                        <p className="text-xs text-muted-foreground">
                                            {isBikeComplete ? "Bicicleta vinculada y protegida" : "Registra o selecciona tu bicicleta"}
                                        </p>
                                    </div>
                                </div>
                                {!isBikeComplete && (
                                    <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", expandedCard === 'bike' && "rotate-180")} />
                                )}
                            </div>
                            
                            {expandedCard === 'bike' && !isBikeComplete && (
                                <div className="p-4 pt-4 border-t bg-slate-50/50 dark:bg-slate-900/50 mt-2">
                                    {!hasBike ? (
                                        <div className="space-y-4">
                                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                                <p>Distintivo Rodada Segura: Por tu seguridad y la de los asistentes al evento, el Organizador requiere que registres tu bicicleta para garantizar un espacio libre de bicicletas ilegales o robadas</p>
                                            </div>
                                            {/* El formulario se renderiza plano en el DOM, resolviendo el bug de Radix UI Combobox */}
                                            <SimpleBikeForm onSuccess={handleBikeSuccess} />
                                        </div>
                                    ) : (
                                        <div className="space-y-4 pt-2">
                                            <EventBikeSelector userBikes={userBikes} registration={registration} eventId={eventId} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}