import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SerialAttendeesTable } from './serial-attendees-table';
import { SerialStagesTab } from './serial-stages-tab';
import { SerialEditTab } from './serial-edit-tab'; 
import { Users, BarChart3, Settings, CalendarDays, ExternalLink, Trophy } from 'lucide-react';
import type { Serial, Event } from '@/lib/types';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface SerialManagementProps {
    serial: Serial;
    stages: Event[];
    competitors: any[]; // Replace with proper SerialCompetitor type later
}

export function SerialManagement({ serial, stages, competitors }: SerialManagementProps) {
    const publicUrl = `/serial/${serial.slug}`;
    const totalRegistrations = competitors.reduce((acc, comp) => acc + Object.keys(comp.stages).length, 0);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-orange-600 text-white hover:bg-orange-700">
                            <Trophy className="w-3 h-3 mr-1" /> Campeonato
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                            {serial.status === 'published' ? 'Activo' : serial.status}
                        </Badge>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">{serial.name}</h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2">
                        {serial.state}, {serial.country}
                    </p>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" asChild className="flex-1 md:flex-none">
                        <Link href={publicUrl} target="_blank">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ver Landing
                        </Link>
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                    <TabsTrigger value="overview">Participantes</TabsTrigger>
                    <TabsTrigger value="stages">Etapas</TabsTrigger>
                    <TabsTrigger value="stats">Indicadores</TabsTrigger>
                    <TabsTrigger value="config">Configuración</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-6 space-y-6">
                    {/* KPIs */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Corredores Únicos</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{competitors.length}</div>
                                <p className="text-xs text-muted-foreground">Ciclistas registrados en el serial</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Etapas Activas</CardTitle>
                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stages.length}</div>
                                <p className="text-xs text-muted-foreground">Fechas configuradas</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Inscripciones</CardTitle>
                                <Trophy className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalRegistrations}</div>
                                <p className="text-xs text-muted-foreground">Boletos vendidos en total</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Tabla General de Participantes</CardTitle>
                            <CardDescription>
                                Audita el estado de inscripción, fidelidad y número de placa de todos los competidores.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SerialAttendeesTable competitors={competitors} stages={stages} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="stages" className="mt-6">
                    <SerialStagesTab stages={stages} serialId={serial.id} />
                </TabsContent>

                <TabsContent value="stats" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Indicadores y Estadísticas</CardTitle>
                            <CardDescription>Módulo analítico en construcción.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground bg-muted/20 border-dashed border-2 rounded-xl">
                            Gráficos de retención e histogramas disponibles próximamente.
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="config" className="mt-6">
                    <SerialEditTab serial={serial} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
