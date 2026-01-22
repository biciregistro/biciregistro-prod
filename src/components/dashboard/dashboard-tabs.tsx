'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { BikeCard } from '@/components/bike-card';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, ArrowRight, Compass } from 'lucide-react';
import type { Bike, UserEventRegistration, User } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DashboardTabsProps {
    bikes: Bike[];
    registrations: UserEventRegistration[];
    user: User;
    isProfileComplete: boolean;
}

function DashboardTabsContent({ bikes, registrations, isProfileComplete, user }: DashboardTabsProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    
    const defaultTab = searchParams.get('tab') === 'events' ? 'events' : 'garage';
    const [activeTab, setActiveTab] = useState(defaultTab);

    // Sync state with URL params
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'events' || tab === 'garage') {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const onTabChange = (value: string) => {
        setActiveTab(value);
        // Update URL without full reload
        router.push(`${pathname}?tab=${value}`, { scroll: false });
    };

    return (
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="garage">Mi Garaje ({bikes.length})</TabsTrigger>
                <TabsTrigger value="events">
                    Mis Eventos ({isProfileComplete ? registrations.length : '?'})
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value="garage" className="space-y-4">
                {bikes.length === 0 ? (
                     <Alert>
                        <AlertTitle>No tienes bicicletas registradas</AlertTitle>
                        <AlertDescription>
                            {isProfileComplete
                                ? 'Usa el botón "Registrar Bici" para añadir tu primera bicicleta y empezar a protegerla.'
                                : 'Completa tu perfil para poder registrar tu primera bicicleta.'
                            }
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div className="space-y-4">
                        {bikes.map((bike: Bike) => (
                            <BikeCard key={bike.id} bike={bike} user={user} />
                        ))}
                    </div>
                )}
            </TabsContent>
            
            <TabsContent value="events" className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold hidden sm:block">Eventos</h2>
                    <Button asChild variant="outline" size="sm" className="ml-auto sm:ml-0">
                        <Link href="/events">
                            <Compass className="mr-2 h-4 w-4 text-primary" />
                            Explorar eventos
                        </Link>
                    </Button>
                </div>

                {!isProfileComplete ? (
                    <Alert className="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-200">
                        <AlertTitle className="text-lg font-semibold mb-2">Perfil Incompleto</AlertTitle>
                        <AlertDescription className="space-y-4">
                            <p>Para acceder a tus eventos y gestionar tus inscripciones, es necesario que completes tu perfil.</p>
                            <Button asChild variant="outline" className="bg-background text-foreground border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50">
                                <Link href="/dashboard/profile">
                                    Completar Perfil Ahora
                                </Link>
                            </Button>
                        </AlertDescription>
                    </Alert>
                ) : registrations.length === 0 ? (
                    <Alert>
                        <AlertTitle>No tienes eventos próximos</AlertTitle>
                        <AlertDescription>
                            <p className="mb-4">Aún no te has registrado en ningún evento.</p>
                            <Button asChild size="sm">
                                <Link href="/events">
                                    Ver eventos disponibles
                                </Link>
                            </Button>
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {registrations.map((reg) => {
                            // Lógica de Finalizado
                            const eventDate = new Date(reg.event.date);
                            const now = new Date();
                            const isFinished = eventDate < now;

                            // Lógica de estado visual (Badge)
                            let badgeText = reg.status === 'confirmed' ? 'Confirmado' : reg.status;
                            let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
                            let badgeClassName = "text-xs shrink-0";

                            if (isFinished) {
                                badgeText = "Finalizado";
                                badgeClassName = cn(badgeClassName, "bg-slate-500 text-white hover:bg-slate-600 border-transparent");
                            } else if (reg.status === 'confirmed') {
                                if (reg.event.costType === 'Con Costo') {
                                    if (reg.paymentStatus === 'paid') {
                                        badgeText = "Pagado";
                                        badgeClassName = cn(badgeClassName, "bg-green-600 hover:bg-green-700 text-white border-transparent");
                                    } else {
                                        badgeText = "Pago Pendiente";
                                        badgeClassName = cn(badgeClassName, "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200");
                                    }
                                } else {
                                    badgeText = "Confirmado";
                                    badgeClassName = cn(badgeClassName, "bg-green-100 text-green-800 border-green-200");
                                }
                            }

                            return (
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
                                                        <Badge variant={badgeVariant} className={badgeClassName}>
                                                            {badgeText}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>{eventDate.toLocaleDateString()}</span>
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
                            );
                        })}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}

export function DashboardTabs(props: DashboardTabsProps) {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <DashboardTabsContent {...props} />
        </Suspense>
    );
}
