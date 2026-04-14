'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Lock, User, Bike, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ProfileForm } from '@/components/user-components';
import { SimpleBikeForm } from '@/components/widget/simple-bike-form';
import { useToast } from '@/hooks/use-toast';
import { triggerConfetti } from '@/lib/confetti';
import { cn } from '@/lib/utils';

interface TicketBlurWallProps {
    userId: string;
    userName: string;
    userLastName: string;
    userEmail: string;
    isProfileComplete: boolean;
    needsBike: boolean;
    userRole: string;
}

export function TicketBlurWall({ 
    userId, 
    userName, 
    userLastName, 
    userEmail,
    isProfileComplete: initialProfileStatus, 
    needsBike: initialBikeStatus,
    userRole
}: TicketBlurWallProps) {
    const { toast } = useToast();
    
    // Internal state to track completion dynamically without full page reload
    const [profileCompleted, setProfileCompleted] = useState(initialProfileStatus);
    const [bikeCompleted, setBikeCompleted] = useState(!initialBikeStatus);
    
    // Modals state
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showBikeModal, setShowBikeModal] = useState(false);

    // Fade out animation state
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    // User object mock for ProfileForm (it needs a full user object, but only updates specific fields)
    const mockUser = {
        id: userId,
        name: userName,
        lastName: userLastName,
        email: userEmail,
        role: userRole as any,
    };

    // Check if both requirements are met to trigger the "Magic Moment"
    useEffect(() => {
        if (profileCompleted && bikeCompleted && isVisible) {
            // Trigger magic moment
            triggerConfetti();
            toast({
                title: "¡Todo Listo!",
                description: "Tu ticket ha sido desbloqueado. Ya puedes continuar.",
                variant: "default"
            });
            
            // Start fade out animation
            setIsFadingOut(true);
            
            // Remove completely after animation
            setTimeout(() => {
                setIsVisible(false);
            }, 600); // 600ms matches the transition duration
        }
    }, [profileCompleted, bikeCompleted, isVisible, toast]);

    const handleProfileSuccess = () => {
        setProfileCompleted(true);
        setShowProfileModal(false);
        toast({
            title: "Perfil Actualizado",
            description: "Tus datos se han guardado correctamente.",
            variant: "default"
        });
    };

    const handleBikeSuccess = (bikeData: any, pointsAwarded?: number) => {
        setBikeCompleted(true);
        setShowBikeModal(false);
        if (pointsAwarded) {
             toast({
                title: `¡Ganaste ${pointsAwarded} KM!`,
                description: "Bicicleta blindada y registrada para el evento.",
                variant: "default"
            });
        }
    };

    // If it's no longer visible, don't render anything (unlocks the UI behind)
    if (!isVisible) return null;

    return (
        <div className={cn(
            "fixed inset-0 z-40 flex items-center justify-center p-4 transition-all duration-500",
            isFadingOut ? "opacity-0 backdrop-blur-none bg-transparent pointer-events-none" : "opacity-100 backdrop-blur-md bg-black/50"
        )}>
            <Card className={cn(
                "w-full max-w-md shadow-2xl border-2 border-primary/20 transform transition-all duration-500 mb-16", // Added mb-16 to avoid bottom nav overlap
                isFadingOut ? "scale-95 opacity-0" : "scale-100 opacity-100 animate-in zoom-in-95"
            )}>
                <CardHeader className="text-center pb-4 border-b bg-slate-50/50 rounded-t-xl">
                    <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 shadow-inner ring-4 ring-white">
                        <Lock className="w-8 h-8 text-amber-600" />
                    </div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">
                        Ticket Bloqueado
                    </CardTitle>
                    <CardDescription className="text-sm font-medium mt-2 text-slate-600 leading-relaxed">
                        ¡Tu lugar está apartado! Por reglas de seguridad y logística, completa estos pasos obligatorios para liberar tu ticket.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4 bg-white">
                    {/* PROFILE REQUIREMENT */}
                    {!initialProfileStatus && (
                        <div className={cn(
                            "p-4 rounded-xl border-2 transition-all flex flex-col gap-3",
                            profileCompleted ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"
                        )}>
                            <div className="flex items-start gap-3">
                                <User className={cn("w-5 h-5 shrink-0 mt-0.5", profileCompleted ? "text-green-600" : "text-slate-500")} />
                                <div>
                                    <h4 className={cn("font-bold text-sm", profileCompleted ? "text-green-900" : "text-slate-900")}>
                                        Datos del Corredor
                                    </h4>
                                    <p className={cn("text-xs leading-relaxed mt-1", profileCompleted ? "text-green-700" : "text-slate-500")}>
                                        Información médica y de contacto de emergencia.
                                    </p>
                                </div>
                            </div>
                            <Button 
                                variant={profileCompleted ? "outline" : "default"}
                                onClick={() => !profileCompleted && setShowProfileModal(true)}
                                className={cn("w-full shadow-sm font-bold", profileCompleted && "border-green-300 text-green-700 bg-white hover:bg-green-50 hover:text-green-800")}
                            >
                                {profileCompleted ? (
                                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Paso Completado</>
                                ) : (
                                    "👤 Completar Datos"
                                )}
                            </Button>
                        </div>
                    )}

                    {/* BIKE REQUIREMENT */}
                    {initialBikeStatus && (
                        <div className={cn(
                            "p-4 rounded-xl border-2 transition-all flex flex-col gap-3",
                            bikeCompleted ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"
                        )}>
                            <div className="flex items-start gap-3">
                                <Bike className={cn("w-5 h-5 shrink-0 mt-0.5", bikeCompleted ? "text-green-600" : "text-slate-500")} />
                                <div>
                                    <h4 className={cn("font-bold text-sm", bikeCompleted ? "text-green-900" : "text-slate-900")}>
                                        Bicicleta del Evento
                                    </h4>
                                    <p className={cn("text-xs leading-relaxed mt-1", bikeCompleted ? "text-green-700" : "text-slate-500")}>
                                        Por tu seguridad y la de los demás asistentes, el organizador requiere que registres la bici con la que participarás.
                                    </p>
                                </div>
                            </div>
                            <Button 
                                variant={bikeCompleted ? "outline" : "default"}
                                onClick={() => !bikeCompleted && setShowBikeModal(true)}
                                className={cn("w-full shadow-sm font-bold", bikeCompleted && "border-green-300 text-green-700 bg-white hover:bg-green-50 hover:text-green-800")}
                            >
                                {bikeCompleted ? (
                                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Paso Completado</>
                                ) : (
                                    "🚲 Registrar Bicicleta"
                                )}
                            </Button>
                        </div>
                    )}

                </CardContent>
            </Card>

            {/* PROFILE MODAL */}
            <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
                <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto p-0 border-0 bg-slate-50" style={{ zIndex: 100000 }}>
                    <DialogHeader className="p-6 pb-2 sticky top-0 bg-slate-50/90 backdrop-blur-md z-10 border-b">
                        <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-900">
                            <User className="w-5 h-5 text-primary" /> Completa tu Perfil
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6 pt-2">
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg mb-6 text-xs flex items-start gap-2">
                             <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                             <p>Tus datos médicos y de contacto de emergencia solo serán compartidos con el organizador durante el evento para tu seguridad.</p>
                        </div>
                        {/* We use the ProfileForm but pass a success callback to close the modal instead of redirecting */}
                        <ProfileForm user={mockUser as any} onSuccess={handleProfileSuccess} />
                    </div>
                </DialogContent>
            </Dialog>

            {/* BIKE MODAL */}
            <Dialog open={showBikeModal} onOpenChange={setShowBikeModal}>
                <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto p-0 border-0 bg-slate-50" style={{ zIndex: 100000 }}>
                     <DialogHeader className="p-6 pb-2 sticky top-0 bg-slate-50/90 backdrop-blur-md z-10 border-b">
                        <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-900">
                            <Bike className="w-5 h-5 text-primary" /> Registrar Bicicleta
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6 pt-4">
                        <SimpleBikeForm onSuccess={handleBikeSuccess} />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
