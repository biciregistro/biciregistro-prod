
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
import { Info, Copy, Check, CalendarPlus, Edit, MessageCircle, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EventCard } from '@/components/ong/event-card';
import type { Event, OngUser } from '@/lib/types';

interface OngDashboardTabsProps {
    ongProfile: OngUser;
    events: Event[];
    communityMembers: any[];
    statsContent?: React.ReactNode; // New Prop
}

function CopyButton({ textToCopy }: { textToCopy: string }) {
    const [isCopied, setIsCopied] = useState(false);
    const { toast } = useToast();

    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setIsCopied(true);
            toast({ title: "¡Copiado!", description: "El link de invitación ha sido copiado." });
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
            {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
    );
}

function WelcomeCard({ ongProfile }: { ongProfile: OngUser }) {
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
                        <div className="flex items-center gap-2 bg-background p-1 rounded-md border w-full sm:w-auto">
                            <span className="text-xs font-medium px-2 text-muted-foreground whitespace-nowrap">Tu Link:</span>
                            <Input 
                                value={ongProfile.invitationLink || 'No disponible'} 
                                readOnly 
                                className="h-8 border-0 bg-transparent focus-visible:ring-0 px-0 min-w-[200px]"
                            />
                            <CopyButton textToCopy={ongProfile.invitationLink || ''} />
                        </div>
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

function OngDashboardTabsContent({ ongProfile, events, communityMembers, statsContent }: OngDashboardTabsProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const defaultTab = 'community';
    const currentTab = searchParams.get('tab') || defaultTab;
    const [activeTab, setActiveTab] = useState(currentTab);

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
                <TabsList className="grid w-full grid-cols-3 mb-8">
                    <TabsTrigger value="community">Mi Comunidad</TabsTrigger>
                    <TabsTrigger value="events">Mis Eventos</TabsTrigger>
                    <TabsTrigger value="stats">Indicadores</TabsTrigger>
                </TabsList>

                <TabsContent value="community" className="space-y-4">
                    <CommunityTable members={communityMembers} />
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
