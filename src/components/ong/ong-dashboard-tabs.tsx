'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Info, Copy, Check, CalendarPlus, Edit, MessageCircle, Settings, PlusCircle, Bike as BikeIcon, ExternalLink, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EventCard } from '@/components/ong/event-card';
import { BikeCard } from '@/components/bike-card';
import type { Event, OngUser, Bike } from '@/lib/types';

interface OngDashboardTabsProps {
    ongProfile: OngUser;
    events: Event[];
    communityMembers: any[];
    bikes?: Bike[];
    statsContent?: React.ReactNode;
}

function ShareButton({ url }: { url: string }) {
    const { toast } = useToast();

    const handleShare = async () => {
        // Construct full URL if relative
        const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Únete a mi comunidad en Biciregistro',
                    text: 'Regístrate y participa en mis eventos.',
                    url: fullUrl,
                });
            } catch (error) {
                console.log('Share cancelled');
            }
        } else {
             navigator.clipboard.writeText(fullUrl).then(() => {
                toast({ title: "¡Copiado!", description: "El enlace al perfil ha sido copiado al portapapeles." });
            });
        }
    };

    return (
        <Button variant="secondary" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Compartir
        </Button>
    );
}

function WelcomeCard({ ongProfile }: { ongProfile: OngUser }) {
    // Determine the public profile URL
    // Ideally use invitationLink if valid, otherwise construct it
    const profileUrl = ongProfile.invitationLink || `/join/${ongProfile.id}`;

    return (
        <Card className="mb-8 bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold">¡Hola, {ongProfile.organizationName}!</h1>
                        <p className="text-muted-foreground">
                            Bienvenido a tu panel de control. Gestiona tu comunidad y eventos desde aquí.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <Button variant="outline" asChild>
                            <Link href="/dashboard/ong/profile">
                                <Settings className="mr-2 h-4 w-4" />
                                Administrar Perfil
                            </Link>
                        </Button>
                        
                        <Button variant="outline" asChild>
                            <Link href={`/join/${ongProfile.id}`} target="_blank">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Ver Perfil Público
                            </Link>
                        </Button>

                        <ShareButton url={profileUrl} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function CommunityTable({ members }: { members: any[] }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Mi Comunidad</CardTitle>
                        <CardDescription>Listado de miembros unidos por link o eventos.</CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                        {members.length} Miembros
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>WhatsApp</TableHead>
                                <TableHead>Ubicación</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.length > 0 ? (
                                members.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium">{member.name} {member.lastName}</TableCell>
                                        <TableCell>{member.email}</TableCell>
                                        <TableCell>
                                            {member.whatsapp ? (
                                                <a 
                                                    href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-green-600 hover:underline"
                                                >
                                                    <MessageCircle className="h-4 w-4" />
                                                    {member.whatsapp}
                                                </a>
                                            ) : <span className="text-muted-foreground text-sm">N/A</span>}
                                        </TableCell>
                                        <TableCell>{member.state}, {member.country}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        Aún no tienes miembros en tu comunidad. ¡Comparte tu link!
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function OngDashboardTabsContent({ ongProfile, events, communityMembers, bikes = [], statsContent }: OngDashboardTabsProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const defaultTab = searchParams.get('tab') || 'community';
    const [activeTab, setActiveTab] = useState(defaultTab);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const onTabChange = (value: string) => {
        setActiveTab(value);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', value);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="space-y-6">
            <WelcomeCard ongProfile={ongProfile} />

            <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-8">
                    <TabsTrigger value="community">Comunidad</TabsTrigger>
                    <TabsTrigger value="garage">Mi Garaje</TabsTrigger>
                    <TabsTrigger value="events">Eventos</TabsTrigger>
                    <TabsTrigger value="stats">Indicadores</TabsTrigger>
                </TabsList>

                <TabsContent value="community" className="space-y-4">
                    <CommunityTable members={communityMembers} />
                </TabsContent>

                <TabsContent value="garage" className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <BikeIcon className="h-5 w-5" />
                            Garaje de la Organización ({bikes.length})
                        </h2>
                        <Link href="/dashboard/register">
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Registrar Bici
                            </Button>
                        </Link>
                    </div>

                    {bikes.length === 0 ? (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>No hay bicicletas registradas</AlertTitle>
                            <AlertDescription>
                                Comienza a registrar las bicicletas de tu organización para tener un mejor control de tu flota.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-4">
                            {bikes.map((bike) => (
                                <BikeCard key={bike.id} bike={bike} />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="events" className="space-y-4">
                    <div className="flex justify-end mb-4">
                        <Link href="/dashboard/ong/events/create">
                            <Button>
                                <CalendarPlus className="mr-2 h-4 w-4" />
                                Crear Nuevo Evento
                            </Button>
                        </Link>
                    </div>
                    
                    {events.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {events.map((event) => (
                                <EventCard key={event.id} event={event} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 border rounded-lg bg-muted/10">
                            <p className="text-muted-foreground mb-4">No has creado ningún evento aún.</p>
                            <Link href="/dashboard/ong/events/create">
                                <Button variant="outline">
                                    Crear mi primer evento
                                </Button>
                            </Link>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="stats" className="space-y-4">
                    {statsContent ? statsContent : (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Próximamente</AlertTitle>
                            <AlertDescription>
                                Aquí podrás visualizar métricas clave sobre el crecimiento de tu comunidad y el impacto de tus eventos.
                            </AlertDescription>
                        </Alert>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

export function OngDashboardTabs(props: OngDashboardTabsProps) {
    return (
        <Suspense fallback={<div>Cargando dashboard...</div>}>
            <OngDashboardTabsContent {...props} />
        </Suspense>
    );
}
