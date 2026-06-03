import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser, getEvent, getUser, getBike } from '@/lib/data';
import { adminDb as db } from '@/lib/firebase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, ArrowLeft, Bike as BikeIcon, User as UserIcon, Calendar, HeartPulse, ShieldAlert, Loader2, Clock, Check, AlertCircle, FileText, Smartphone } from 'lucide-react';
import type { EventRegistration, Event, User, Bike } from '@/lib/types';
import { toggleCheckInStatus } from '@/lib/actions';

interface CheckinPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminCheckinPage(props: CheckinPageProps) {
  // 1. SECURITY CHECK: Verify authenticated user is admin or ong
  const staff = await getAuthenticatedUser();
  if (!staff) {
    redirect('/login');
  }

  if (staff.role !== 'admin' && staff.role !== 'ong') {
    // If regular cyclist scanned, redirect them safely to dashboard
    redirect('/dashboard?tab=events');
  }

  // Await params in Next.js 15+
  const { id: registrationId } = await props.params;

  if (!registrationId) {
    return (
      <div className="container max-w-md mx-auto py-12 px-4">
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="w-12 h-12 text-red-600 mx-auto" />
            <h2 className="text-xl font-bold text-red-900">ID de Registro Inválido</h2>
            <p className="text-sm text-red-700">No se proporcionó un ID de inscripción para procesar.</p>
            <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard">Volver al Panel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. FETCH INSCRIPTION DATA
  let registration: (EventRegistration & { id: string }) | null = null;
  let event: Event | null = null;
  let cyclist: User | null = null;
  let bike: Bike | null = null;

  try {
    const regDoc = await db.collection('event_registrations').doc(registrationId).get();
    if (regDoc.exists) {
        registration = { id: regDoc.id, ...regDoc.data() } as EventRegistration & { id: string };
        
        // Fetch relations
        event = await getEvent(registration.eventId);
        cyclist = await getUser(registration.userId);
        
        if (registration.bikeId) {
            bike = await getBike(registration.userId, registration.bikeId);
        }
    }
  } catch (error) {
     console.error("Error fetching checkin details:", error);
  }

  if (!registration || !event || !cyclist) {
      return (
        <div className="container max-w-md mx-auto py-12 px-4">
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-6 text-center space-y-4">
              <XCircle className="w-12 h-12 text-red-600 mx-auto" />
              <h2 className="text-xl font-bold text-red-900">Registro No Encontrado</h2>
              <p className="text-sm text-red-700">Esta inscripción no existe o fue eliminada de la plataforma.</p>
              <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard">Volver al Panel</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
  }

  // Strict Authorization: If the staff is an 'ong' role, verify they own the event
  if (staff.role === 'ong' && event.ongId !== staff.id) {
       return (
        <div className="container max-w-md mx-auto py-12 px-4">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-6 text-center space-y-4">
              <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto" />
              <h2 className="text-xl font-bold text-amber-900">Acceso No Autorizado</h2>
              <p className="text-sm text-amber-700">Este boleto pertenece a un evento organizado por otra asociación.</p>
              <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard">Volver al Panel</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
  }

  const isFinished = new Date(event.date) < new Date();
  const isPaid = event.costType === 'Gratuito' || registration.paymentStatus === 'paid';

  // SERVER ACTION TO PROCESS CHECK-IN IN SITU
  const handleCheckin = async () => {
      'use server';
      if (registration) {
          const result = await toggleCheckInStatus(registration.id, event!.id, true);
          if (result.success) {
              // Redirect back to clean page showing check-in done
              redirect(`/admin/checkin/${registration.id}?success=true`);
          }
      }
  };

  // SUCCESS UI (Educating Staff to scan next QR)
  if (registration.checkedIn) {
      return (
          <div className="container max-w-lg mx-auto py-8 px-4 h-screen flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
              <Card className="overflow-hidden shadow-2xl border-t-8 border-green-500 w-full text-center">
                  <CardHeader className="bg-green-50/50 pb-8 pt-10">
                      <div className="mx-auto bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner">
                          <CheckCircle2 className="w-14 h-14 text-green-600" />
                      </div>
                      <CardTitle className="text-3xl font-black text-green-950 uppercase tracking-tight">Check-In Exitoso</CardTitle>
                      <CardDescription className="text-base text-green-800 font-medium mt-2">
                          El acceso de <span className="font-bold">{cyclist.name} {cyclist.lastName}</span> ha sido registrado correctamente.
                      </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-8 pb-10 space-y-6 px-8">
                      <div className="space-y-4">
                          <Smartphone className="w-16 h-16 text-slate-300 mx-auto animate-bounce" />
                          <h3 className="text-xl font-bold text-slate-800">Cierra esta pestaña para continuar</h3>
                          <p className="text-sm text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                              Abre la cámara de tu celular y escanea el código QR del siguiente participante en la fila.
                          </p>
                      </div>
                  </CardContent>

                  <CardFooter className="bg-muted/10 p-6 flex-col gap-3 border-t">
                      <Button asChild variant="outline" className="w-full text-muted-foreground">
                          <Link href={staff.role === 'ong' ? `/dashboard/ong/events/${event.id}` : `/admin`}>
                              Revisar Lista de Asistentes
                          </Link>
                      </Button>
                  </CardFooter>
              </Card>
          </div>
      );
  }

  // VALIDATION UI (Before Check-In)
  return (
    <div className="container max-w-lg mx-auto py-8 px-4">
      
      <div className="mb-6">
        <Button asChild variant="ghost" className="text-muted-foreground">
          <Link href={staff.role === 'ong' ? `/dashboard/ong/events/${event.id}` : `/admin`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a la Lista
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden shadow-xl border-t-4 border-primary">
        <CardHeader className="bg-muted/30 pb-4 text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1">Módulo de Acceso Operativo</div>
            <CardTitle className="text-xl font-black">{event.name}</CardTitle>
            <CardDescription className="flex items-center justify-center gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(event.date).toLocaleDateString()} 
                <span className="text-muted-foreground">|</span>
                <Clock className="w-3.5 h-3.5" />
                {new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                <Clock className="w-12 h-12 text-amber-600 mx-auto animate-pulse" />
                <div>
                    <h3 className="font-black text-amber-950 uppercase tracking-wide">Pendiente de Ingreso</h3>
                    <p className="text-xs text-amber-800 font-medium">Valida los datos antes de autorizar el paso.</p>
                </div>
            </div>

            {/* CYCLIST IDENTITY */}
            <div className="space-y-3 bg-muted/10 p-4 rounded-xl border border-dashed">
                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                    <UserIcon className="w-4 h-4" /> Corredor
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Nombre Completo</p>
                    <p className="text-lg font-black uppercase text-foreground">{cyclist.name} {cyclist.lastName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                        <p className="text-xs text-muted-foreground">Nivel / Dorsal</p>
                        <p className="font-bold text-sm">{registration.tierName || 'Gratuito'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">No. Competidor</p>
                        <p className="font-mono font-black text-sm text-primary">
                            {registration.bibNumber ? `#${registration.bibNumber.toString().padStart(3, '0')}` : 'Sin Dorsal'}
                        </p>
                    </div>
                </div>
            </div>

            {/* VEHICLE VALIDATION */}
            <div className="space-y-3 bg-muted/10 p-4 rounded-xl border border-dashed">
                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                    <BikeIcon className="w-4 h-4" /> Unidad Registrada (Pasaporte)
                </div>
                {bike ? (
                    <div className="space-y-2">
                        <div>
                            <p className="text-xs text-muted-foreground">Marca / Modelo</p>
                            <p className="font-black uppercase text-sm text-foreground">{bike.make} {bike.model}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Número de Serie (S/N)</p>
                                <p className="font-mono text-xs font-bold bg-white dark:bg-slate-900 border px-2 py-0.5 rounded w-fit">{bike.serialNumber}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Color / Estatus</p>
                                <p className="font-medium text-xs">{bike.color} / <span className="font-bold text-green-600">En Regla</span></p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p className="font-medium">El ciclista no ha vinculado ninguna bicicleta para este evento. Favor de solicitar identificación física del vehículo antes de autorizar.</p>
                    </div>
                )}
            </div>

            {/* MEDICAL DATA */}
            {event.requiresEmergencyContact && (
                <div className="space-y-3 bg-red-50/20 p-4 rounded-xl border border-red-100">
                    <div className="flex items-center gap-2 text-red-600 font-bold text-sm uppercase tracking-wider">
                        <HeartPulse className="w-4 h-4" /> Ficha Médica de Emergencia
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Tipo de Sangre</p>
                            <p className="font-black text-red-600 text-sm">{registration.bloodType || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Alergias</p>
                            <p className="font-bold">{registration.allergies || 'Ninguna'}</p>
                        </div>
                        <div className="col-span-2 border-t pt-2 border-dashed border-red-100">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Contacto de Emergencia</p>
                            <p className="font-bold text-slate-800">{registration.emergencyContactName}</p>
                            <p className="font-mono text-muted-foreground">{registration.emergencyContactPhone}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* WAIVER STATEMENT */}
            {event.requiresWaiver && (
                <div className="flex items-center justify-between p-3 border rounded-xl bg-slate-50 text-xs">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-slate-700">Carta Responsiva Digital</span>
                    </div>
                    {registration.waiverSignature ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">FIRMADA</Badge>
                    ) : (
                        <Badge variant="destructive" className="text-[10px]">NO FIRMADA</Badge>
                    )}
                </div>
            )}

            {/* FINANCIAL COMPLIANCE WARNING */}
            {!isPaid && (
                <Alert variant="destructive" className="[&>svg]:text-red-600 bg-red-50/50 border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-bold">Pago Pendiente de Confirmar</AlertTitle>
                    <AlertDescription className="text-xs">
                        El competidor no ha realizado el pago por su boleto. Solicita el comprobante o cobro en efectivo antes de realizar el Check-in.
                    </AlertDescription>
                </Alert>
            )}
        </CardContent>

        <CardFooter className="bg-muted/10 p-6 border-t">
            <form action={handleCheckin} className="w-full">
                <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-black tracking-widest text-sm uppercase h-14 shadow-lg shadow-green-100 dark:shadow-none"
                >
                    <Check className="mr-2 h-5 w-5" /> Confirmar Check-In
                </Button>
            </form>
        </CardFooter>
      </Card>
    </div>
  );
}
