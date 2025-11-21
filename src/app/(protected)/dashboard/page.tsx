import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getAuthenticatedUser, getBikes, getUserEventRegistrations } from '@/lib/data';
import type { Bike, User } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { BikeCard } from '@/components/bike-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { PlusCircle, Edit, Calendar, MapPin, ArrowRight } from 'lucide-react';

// --- Helper function to check if the user profile is complete ---
const isProfileComplete = (user: User): boolean => {
    // A profile is considered incomplete if essential fields are missing.
    // birthDate is a good indicator as it is only added on the profile edit page.
    return !!user.birthDate && !!user.country && !!user.state;
};

// --- Action Panel Component ---
function ActionPanel({ user, isComplete }: { user: User, isComplete: boolean }) {
    return (
        <div className="p-6 bg-card border rounded-lg mb-8">
            <h1 className="text-2xl font-bold">¡Hola, {user.name}!</h1>
            <p className="text-muted-foreground mb-4">
                {isComplete 
                    ? "Bienvenido de nuevo a tu garaje. Desde aquí puedes gestionar tus bicicletas y tu perfil."
                    : "¡Bienvenido a BiciRegistro! Completa tu perfil para poder registrar tu primera bicicleta."
                }
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild>
                    <Link href="/dashboard/profile">
                        <Edit className="mr-2 h-4 w-4" />
                        {isComplete ? 'Editar Perfil' : 'Completa tu perfil'}
                    </Link>
                </Button>
                
                {isComplete ? (
                    <Button asChild>
                        <Link href="/dashboard/register">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Registrar Bici
                        </Link>
                    </Button>
                ) : (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                {/* The span is necessary for the tooltip to work on a disabled button */}
                                <span tabIndex={0}>
                                    <Button disabled className="w-full sm:w-auto">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Registrar Bici
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Por favor completa tu perfil antes de registrar una bicicleta.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </div>
    );
}

// --- Main Dashboard Page ---
export default async function DashboardPage() {
    const user = await getAuthenticatedUser();
    
    if (!user) {
        redirect('/login');
    }

    const profileIsComplete = isProfileComplete(user);
    const bikes = profileIsComplete ? await getBikes(user.id) : [];
    const registrations = await getUserEventRegistrations(user.id);

    return (
        <div className="container max-w-5xl mx-auto py-6 md:py-8 px-4">
            {/* Action Panel */}
            <ActionPanel user={user} isComplete={profileIsComplete} />

            <h2 className="text-2xl font-bold mb-6">Tus Bicicletas</h2>
            
            {/* Bikes List */}
            {bikes.length === 0 ? (
                 <Alert className="mb-10">
                    <AlertTitle>No tienes bicicletas registradas</AlertTitle>
                    <AlertDescription>
                        {profileIsComplete
                            ? 'Usa el botón "Registrar Bici" para añadir tu primera bicicleta y empezar a protegerla.'
                            : 'Completa tu perfil para poder registrar tu primera bicicleta.'
                        }
                    </AlertDescription>
                </Alert>
            ) : (
                <div className="space-y-4 mb-10">
                    {bikes.map((bike: Bike) => (
                        <BikeCard key={bike.id} bike={bike} />
                    ))}
                </div>
            )}

            <h2 className="text-2xl font-bold mb-6 mt-12 pt-6 border-t">Mis Eventos</h2>
            {registrations.length === 0 ? (
                <Alert>
                    <AlertTitle>No tienes eventos próximos</AlertTitle>
                    <AlertDescription>
                        Explora los eventos disponibles y regístrate para participar.
                    </AlertDescription>
                </Alert>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {registrations.map((reg) => (
                        <Card key={reg.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="p-0">
                                <div className="flex flex-col sm:flex-row">
                                    <div className="w-full sm:w-32 h-32 bg-muted flex-shrink-0 relative">
                                         {reg.event.imageUrl ? (
                                            <img src={reg.event.imageUrl} alt={reg.event.name} className="w-full h-full object-cover" />
                                         ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                <Calendar className="h-8 w-8" />
                                            </div>
                                         )}
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start gap-2">
                                                <h3 className="font-bold text-lg line-clamp-1">{reg.event.name}</h3>
                                                <Badge variant="secondary" className="text-xs shrink-0">
                                                    {reg.status === 'confirmed' ? 'Confirmado' : reg.status}
                                                </Badge>
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-1 space-y-1">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>{new Date(reg.event.date).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    <span className="line-clamp-1">{reg.event.state}, {reg.event.country}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80 p-0 h-auto">
                                                <Link href={`/dashboard/events/${reg.eventId}`} className="flex items-center gap-1">
                                                    Ver Detalles <ArrowRight className="h-3 w-3" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
