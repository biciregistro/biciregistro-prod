import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser, getEvent, getEventAttendees } from '@/lib/data';
import { getEventFinancialSummary, getPayoutsByEvent } from '@/lib/financial-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Edit, Eye, Users, MapPin, Share2, DollarSign, UserCheck, ShieldAlert } from 'lucide-react';
import { CopyButton } from '@/components/ong-components';
import { EventStatusButton } from '@/components/ong/event-status-button';
import { EventStatusBadge } from '@/components/ong/event-status-badge';
import { AttendeeManagement } from '@/components/ong/attendee-management';
import { EventFinancialSummary } from '@/components/ong/event-financial-summary';

export default async function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();

  if (!user) redirect('/login');
  if (user.role !== 'ong' && user.role !== 'admin') redirect('/dashboard');

  const event = await getEvent(id);

  if (!event) notFound();
  if (user.role === 'ong' && event.ongId !== user.id) redirect('/dashboard/ong');

  const [attendees, financialSummary, payouts] = await Promise.all([
    getEventAttendees(id),
    getEventFinancialSummary(id),
    getPayoutsByEvent(id)
  ]);

  const eventDate = new Date(event.date);
  const isFinished = eventDate < new Date();
  const publicUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx'}/events/${event.id}`;
  
  const showEmergencyContact = event.requiresEmergencyContact;
  const showBikeInfo = event.requiresBike !== false;
  const showWaiverInfo = event.requiresWaiver === true;

  const totalCheckedIn = attendees.filter(a => a.checkedIn).length;
  const attendancePercentage = event.currentParticipants && event.currentParticipants > 0 
      ? Math.round((totalCheckedIn / event.currentParticipants) * 100) 
      : 0;

  const formattedRevenue = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
  }).format(financialSummary.total.gross);

  return (
    <div className="container py-8 px-4 md:px-6 space-y-8">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <Link href="/dashboard/ong" className="text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2 text-sm">
                <ArrowLeft className="h-4 w-4" /> Volver a Mis Eventos
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
            <div className="flex items-center gap-2 mt-2">
                <EventStatusBadge status={event.status} date={event.date} />
            </div>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {!isFinished && (
                <EventStatusButton eventId={event.id} currentStatus={event.status} />
            )}
            
            <Button variant="outline" asChild className="flex-1 md:flex-none">
                <Link href={`/events/${event.id}`} target="_blank">
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Página Pública
                </Link>
            </Button>
            <Button asChild className="flex-1 md:flex-none">
                <Link href={`/dashboard/ong/events/${event.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                </Link>
            </Button>
        </div>
      </div>
      
      {event.isBlocked && (
        <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-800 dark:text-red-300 text-lg">Gestión Suspendida Temporalmente</AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-400 mt-2">
                La administración ha bloqueado las funciones de gestión para este evento. 
                Por favor, revisa tu balance financiero o contacta a soporte para regularizar tu situación.
            </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Resumen y Asistentes</TabsTrigger>
          <TabsTrigger value="finance">Finanzas y Balance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Registrados</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{event.currentParticipants || 0}</div>
                  <p className="text-xs text-muted-foreground">Inscripciones confirmadas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Asistencia Real</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCheckedIn}</div>
                  <p className="text-xs text-muted-foreground">{attendancePercentage}% de asistencia</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recaudación Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formattedRevenue}</div>
                  <p className="text-xs text-muted-foreground">Total pagado (Plataforma + Efectivo)</p>
                </CardContent>
              </Card>
              
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Compartir</CardTitle>
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

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ubicación</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium truncate mb-2">{event.state}, {event.country}</div>
                  {event.googleMapsUrl && (
                      <Button variant="outline" size="sm" asChild className="w-full h-8 text-xs">
                          <Link href={event.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                              <MapPin className="mr-2 h-3 w-3" />
                              Ver Mapa
                          </Link>
                      </Button>
                  )}
                </CardContent>
              </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Asistencia y Pagos</CardTitle>
              <CardDescription>
                Controla quién ha pagado y quién asiste al evento en tiempo real.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <AttendeeManagement 
                    attendees={attendees} 
                    eventId={event.id}
                    eventName={event.name}
                    showEmergencyContact={showEmergencyContact}
                    showBikeInfo={showBikeInfo}
                    showWaiverInfo={showWaiverInfo}
                    isBlocked={event.isBlocked}
                />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="mt-6">
          <EventFinancialSummary data={financialSummary} payouts={payouts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
