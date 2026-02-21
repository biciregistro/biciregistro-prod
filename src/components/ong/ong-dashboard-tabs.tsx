'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Info, 
    CalendarPlus, 
    MessageCircle, 
    PlusCircle, 
    Bike as BikeIcon, 
    Megaphone, 
    Phone, 
    HeartPulse, 
    ShieldAlert, 
    AlertCircle,
    User,
    Mail,
    MapPin
} from 'lucide-react';
import { EventCard } from '@/components/ong/event-card';
import { BikeCard } from '@/components/bike-card';
import { OngDashboardHero } from '@/components/ong/ong-dashboard-hero';
import { OngCampaignManager } from '@/components/ong/ong-campaign-manager';
import type { Event, OngUser, Bike, Campaign } from '@/lib/types';
import { cn } from '@/lib/utils';

interface OngDashboardTabsProps {
    ongProfile: OngUser;
    events: Event[];
    communityMembers: any[];
    bikes?: Bike[];
    campaigns: Campaign[]; // New prop
    statsContent?: React.ReactNode;
}

function CommunityTable({ members }: { members: any[] }) {
    return (
        <Card className="shadow-md">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            <User className="h-6 w-6 text-primary" />
                            Mi Comunidad
                        </CardTitle>
                        <CardDescription>Gestión de miembros y datos de seguridad.</CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-lg px-4 py-1.5 font-bold">
                        {members.length} Ciclistas
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-xl border shadow-sm overflow-hidden bg-card">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-bold">Ciclista</TableHead>
                                    <TableHead className="font-bold">Contacto</TableHead>
                                    <TableHead className="font-bold">Emergencia</TableHead>
                                    <TableHead className="font-bold">Info Médica</TableHead>
                                    <TableHead className="font-bold">Bicicletas Registradas</TableHead>
                                    <TableHead className="font-bold">Ubicación</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.length > 0 ? (
                                    members.map((member) => (
                                        <TableRow key={member.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-base">{member.name} {member.lastName}</span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />
                                                        {member.email}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {member.whatsapp ? (
                                                    <a 
                                                        href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 text-green-600 font-medium hover:underline"
                                                    >
                                                        <MessageCircle className="h-4 w-4" />
                                                        {member.whatsapp}
                                                    </a>
                                                ) : <span className="text-muted-foreground text-xs italic">Sin WhatsApp</span>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {member.emergencyContactName ? (
                                                        <>
                                                            <span className="text-sm font-medium">{member.emergencyContactName}</span>
                                                            <a 
                                                                href={`tel:${member.emergencyContactPhone}`}
                                                                className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-mono"
                                                            >
                                                                <Phone className="h-3 w-3" />
                                                                {member.emergencyContactPhone}
                                                            </a>
                                                        </>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs italic flex items-center gap-1">
                                                            <AlertCircle className="h-3 w-3" /> No proporcionado
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1.5">
                                                    {member.bloodType ? (
                                                        <Badge variant="outline" className="w-fit border-red-200 text-red-700 bg-red-50 gap-1 text-[10px] py-0">
                                                            <HeartPulse className="h-3 w-3" /> {member.bloodType}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-[10px] italic">Sin tipo de sangre</span>
                                                    )}
                                                    
                                                    {member.allergies && member.allergies.toLowerCase() !== 'ninguna' ? (
                                                        <div className="flex items-center gap-1 text-[10px] text-orange-600 font-medium bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                                                            <ShieldAlert className="h-3 w-3" /> {member.allergies}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-[10px] italic">Sin alergias</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-2">
                                                    {member.bikes && member.bikes.length > 0 ? (
                                                        member.bikes.map((bike: any) => (
                                                            <div key={bike.id} className="flex flex-col border-l-2 border-primary/20 pl-2 py-0.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <BikeIcon className="h-3 w-3 text-primary" />
                                                                    <span className="text-xs font-bold">{bike.make} {bike.model}</span>
                                                                </div>
                                                                <div className="flex gap-2 items-center mt-0.5">
                                                                    <Badge variant="secondary" className="text-[9px] py-0 px-1 font-normal capitalize">
                                                                        {bike.color}
                                                                    </Badge>
                                                                    <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1 rounded">
                                                                        {bike.serialNumber}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-amber-600 text-[10px] font-medium italic">Sin bicis registradas</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-medium">{member.state}</span>
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                                                        <MapPin className="h-3 w-3" /> {member.country}
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <User className="h-8 w-8 opacity-20" />
                                                <p>Aún no tienes miembros en tu comunidad.</p>
                                                <p className="text-xs">¡Comparte tu link de invitación para que aparezcan aquí!</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function OngDashboardTabsContent({ ongProfile, events, communityMembers, bikes = [], campaigns = [], statsContent }: OngDashboardTabsProps) {
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
            <OngDashboardHero ongProfile={ongProfile} />

            <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-8">
                    <TabsTrigger value="community">Comunidad</TabsTrigger>
                    <TabsTrigger value="garage">Mi Garaje</TabsTrigger>
                    <TabsTrigger value="events">Eventos</TabsTrigger>
                    <TabsTrigger value="campaigns">Campañas</TabsTrigger>
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

                <TabsContent value="campaigns" className="space-y-4">
                    <OngCampaignManager 
                        campaigns={campaigns} 
                        user={{
                            id: ongProfile.id,
                            name: ongProfile.organizationName,
                            organizationName: ongProfile.organizationName
                        }} 
                    />
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
