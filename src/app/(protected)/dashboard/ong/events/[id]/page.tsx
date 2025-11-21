import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser, getEvent } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, Eye, Users, Calendar, MapPin, Share2 } from 'lucide-react';
import { CopyButton } from '@/components/ong-components';

export default async function EventDetailsPage({ params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser();

  if (!user) redirect('/login');
  if (user.role !== 'ong') redirect('/dashboard');

  const event = await getEvent(params.id);

  if (!event) notFound();
  if (event.ongId !== user.id) redirect('/dashboard/ong');

  const eventDate = new Date(event.date);
  const publicUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx'}/events/${event.id}`;

  return (
    <div className="container py-8 px-4 md:px-6 space-y-8">
      
      {/* Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <Link href="/dashboard/ong" className="text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2 text-sm">
                <ArrowLeft className="h-4 w-4" /> Volver a Mis Eventos
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
            <div className="flex items-center gap-2 mt-2">
                <Badge variant={event.status === 'published' ? 'default' : 'secondary'}>
                    {event.status === 'published' ? 'Publicado' : 'Borrador'}
                </Badge>
                <span className="text-muted-foreground text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {eventDate.toLocaleDateString()}
                </span>
            </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" asChild className="flex-1 md:flex-none">
                <Link href={`/events/${event.id}`} target="_blank">
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Página Pública
                </Link>
            </Button>
            <Button asChild className="flex-1 md:flex-none">
                <Link href={`/dashboard/ong/events/${event.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Evento
                </Link>
            </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registrados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Participantes confirmados</p>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compartir Evento</CardTitle>
                <Share2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground truncate flex-1 bg-muted p-1 rounded">
                        {publicUrl}
                    </div>
                    <CopyButton textToCopy={publicUrl} />
                </div>
            </CardContent>
        </Card>

        {/* Future KPI: Revenue or other stats */}
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">{event.state}, {event.country}</div>
            <p className="text-xs text-muted-foreground capitalize">{event.eventType}</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendees List (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Asistentes</CardTitle>
          <CardDescription>Gestioan a los ciclistas registrados en tu evento.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Correo Electrónico</TableHead>
                            <TableHead>Fecha Registro</TableHead>
                            <TableHead>Bicicleta</TableHead>
                            <TableHead className="text-right">Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Empty State */}
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No hay participantes registrados aún.
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
