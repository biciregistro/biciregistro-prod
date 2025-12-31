import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser, getEvent, getUserRegistrationForEvent, getOngProfile, getBikes } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Clock, ArrowLeft, Tag, Trophy, Hash, AlertCircle, CheckCircle2, Package, User, Phone, Globe, HeartPulse, FileText, Download, Shirt, TriangleAlert } from 'lucide-react';
import { EventActionCard } from '@/components/dashboard/event-action-card';
import { EventBikeSelector } from '@/components/dashboard/event-bike-selector';
import { PaymentStatusHandler } from '@/components/payment-status-handler';
import { SponsorsCarousel } from '@/components/shared/sponsors-carousel';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Helper component for client-side waiver download trigger
import { WaiverDownloadButton } from './waiver-download-button-client'; 

export default async function EventRegistrationDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();

  if (!user) redirect('/login');

  const { id: eventId } = await params;
  const event = await getEvent(eventId);

  if (!event) notFound();

  const registration = await getUserRegistrationForEvent(user.id, eventId);

  if (!registration) {
      redirect(`/events/${eventId}`);
  }

  const ongProfile = await getOngProfile(event.ongId);
  const eventDate = new Date(event.date);
  const now = new Date();
  const isFinished = eventDate < now;
  const userBikes = await getBikes(user.id);

  const tier = event.costTiers?.find(t => t.id === registration.tierId);
  const category = event.categories?.find(c => c.id === registration.categoryId);
  // Find selected Jersey if any
  let jerseyConfig = undefined;
  if (event.hasJersey && registration.jerseyModel && event.jerseyConfigs) {
      jerseyConfig = event.jerseyConfigs.find(jc => jc.name === registration.jerseyModel || jc.id === registration.jerseyModel);
  }

  const tierName = tier ? tier.name : (event.costType === 'Gratuito' ? 'Gratuito' : 'N/A');
  const categoryName = category ? category.name : 'N/A';
  const price = tier ? tier.price : 0;

  const whatsappMessage = `Hola Soy ${user.name}, me inscribí al evento ${event.name}, en la categoría ${categoryName} y en el nivel ${tierName}. Tengo una duda.`;
  const whatsappUrl = ongProfile?.contactWhatsapp 
    ? `https://wa.me/${ongProfile.contactWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`
    : '#';

  let badgeText = registration.status === 'confirmed' ? 'Registro Confirmado' : registration.status;
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = registration.status === 'confirmed' ? 'default' : 'secondary';
  let badgeClassName = "text-base px-3 py-1 capitalize";

  if (isFinished) {
      badgeText = "Evento Finalizado";
      badgeClassName = cn(badgeClassName, "bg-slate-500 text-white hover:bg-slate-600 border-transparent");
      badgeVariant = "secondary";
  } else if (registration.status === 'confirmed') {
      if (event.costType === 'Con Costo') {
          if (registration.paymentStatus === 'paid') {
              badgeText = "Registro Confirmado y Pagado";
              badgeClassName = cn(badgeClassName, "bg-green-600 hover:bg-green-700 text-white border-transparent");
          } else {
              badgeText = "Pago Pendiente";
              badgeVariant = "secondary";
              badgeClassName = cn(badgeClassName, "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200");
          }
      }
  } else if (registration.status === 'cancelled') {
      badgeText = "Cancelado";
      badgeVariant = "destructive";
  }

  const showBibNumber = event.bibNumberConfig?.enabled;
  const userPhone = user.phone || user.whatsapp;
  const isProfileComplete = userPhone && user.city && user.state && user.country;

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <PaymentStatusHandler />
      
      {/* --- HEADER --- */}
      <div className="mb-8 space-y-4">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2 text-sm font-medium w-fit">
            <ArrowLeft className="h-4 w-4" /> Volver a Mi Dashboard
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-4 border-b">
            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">{event.name}</h1>
                    <Badge variant={badgeVariant} className={badgeClassName}>
                        {badgeText}
                    </Badge>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{eventDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{event.state}, {event.country}</span>
                    </div>
                    {event.googleMapsUrl && (
                        <Link href={event.googleMapsUrl} target="_blank" className="text-primary hover:underline font-medium text-xs flex items-center gap-1">
                            (Ver Mapa)
                        </Link>
                    )}
                </div>
            </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* --- MAIN CONTENT COLUMN --- */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* 1. TARJETA DE IDENTIDAD (Dorsal + Datos) */}
            <Card className="overflow-hidden border-t-4 border-t-primary shadow-sm">
                <CardHeader className="bg-muted/10 pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <User className="h-5 w-5 text-primary" /> 
                        Identidad del Participante
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    {/* Fila 1: Número de Corredor (Si aplica) */}
                    {showBibNumber && (
                        <div className="flex flex-col items-center justify-center p-6 bg-muted/20 rounded-xl border border-dashed border-primary/20">
                            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tu Número de Corredor</p>
                            {registration.bibNumber ? (
                                <div className="text-center">
                                    <span className="text-6xl font-black text-primary font-mono tracking-tighter">
                                        #{registration.bibNumber.toString().padStart(3, '0')}
                                    </span>
                                    <div className="mt-2 flex items-center justify-center gap-1 text-green-600 font-medium text-sm">
                                        <CheckCircle2 className="h-4 w-4" /> Asignado Oficialmente
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
                                    <AlertCircle className="h-5 w-5" />
                                    <span className="font-medium">
                                        {event.bibNumberConfig?.mode === 'automatic' 
                                            ? "Pendiente de asignación (Completa tu pago)" 
                                            : "Se asignará en la entrega de kits"}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fila 2: Datos Personales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Nombre Completo</p>
                            <p className="text-lg font-semibold">{user.name} {user.lastName}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Contacto</p>
                            <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <p className="font-medium">{userPhone || <span className="text-muted-foreground italic">No registrado</span>}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Ubicación</p>
                            <div className="flex items-center gap-2">
                                <Globe className="h-3 w-3 text-muted-foreground" />
                                <p className="font-medium">
                                    {user.city && user.state ? `${user.city}, ${user.state}` : <span className="text-muted-foreground italic">No registrada</span>}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Género</p>
                            <p className="font-medium capitalize">{user.gender || <span className="text-muted-foreground italic">No especificado</span>}</p>
                        </div>
                    </div>

                    {/* Alerta de Perfil Incompleto */}
                    {!isProfileComplete && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                            <div className="flex items-start gap-3">
                                <TriangleAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-amber-800">Tu perfil está incompleto</p>
                                    <p className="text-sm text-amber-700">Para facilitar la logística y seguridad del evento, por favor completa tus datos de contacto.</p>
                                </div>
                            </div>
                            <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 bg-white" asChild>
                                <Link href="/dashboard/profile">Completar Perfil</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 2. TARJETA DE CATEGORÍA Y JERSEY (Si aplica) */}
            {(category || (event.hasJersey && registration.jerseyModel)) && (
                <Card className="overflow-hidden shadow-sm">
                    <CardHeader className="bg-muted/10 pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Trophy className="h-5 w-5 text-primary" />
                            Detalles de Participación
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Columna Categoría */}
                            {category && (
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-muted-foreground" />
                                        Categoría Inscrita
                                    </h4>
                                    <div className="bg-secondary/20 p-4 rounded-lg border border-secondary/30">
                                        <p className="text-xl font-bold text-primary mb-1">{category.name}</p>
                                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1 bg-background px-2 py-1 rounded shadow-sm">
                                                <User className="h-3 w-3" />
                                                {category.ageConfig?.isRestricted 
                                                    ? `${category.ageConfig.minAge} - ${category.ageConfig.maxAge} años` 
                                                    : "Edad Libre"}
                                            </span>
                                            {category.startTime && (
                                                <span className="flex items-center gap-1 bg-background px-2 py-1 rounded shadow-sm text-green-700 font-medium">
                                                    <Clock className="h-3 w-3" />
                                                    Salida: {category.startTime}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        <span className="font-semibold">Nivel de Acceso:</span> {tierName} {tier?.price ? `($${tier.price})` : '(Gratuito)'}
                                    </div>
                                </div>
                            )}

                            {/* Columna Jersey */}
                            {event.hasJersey && registration.jerseyModel && (
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                                        <Shirt className="h-4 w-4 text-muted-foreground" />
                                        Kit / Jersey
                                    </h4>
                                    <div className="bg-secondary/20 p-4 rounded-lg border border-secondary/30 flex items-center gap-4">
                                        <div className="h-12 w-12 bg-background rounded-full flex items-center justify-center shadow-sm">
                                            <Shirt className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground">{jerseyConfig?.name || registration.jerseyModel}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Talla: <span className="font-bold text-foreground bg-background px-2 rounded ml-1">{registration.jerseySize}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 3. TARJETA DE BICICLETA */}
            {(event.requiresBike !== false) && (
                <div className="space-y-2">
                    {!isFinished && (
                        <EventBikeSelector userBikes={userBikes} registration={registration} eventId={event.id} />
                    )}
                    
                    {/* Si finalizó, mostrar tarjeta estática */}
                    {isFinished && registration.bikeId && (
                        <Card>
                            <CardHeader className="bg-muted/10 pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Package className="h-5 w-5 text-primary" />
                                    Bicicleta Registrada
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="bg-primary/10 p-3 rounded-full">
                                        <Package className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold">
                                            {userBikes.find(b => b.id === registration.bikeId)?.make} {userBikes.find(b => b.id === registration.bikeId)?.model}
                                        </p>
                                        <p className="text-sm font-mono text-muted-foreground">
                                            Serie: {userBikes.find(b => b.id === registration.bikeId)?.serialNumber}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">Color: {userBikes.find(b => b.id === registration.bikeId)?.color}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* 4. TARJETA MÉDICA Y LEGAL (Si aplica) */}
            {(event.requiresEmergencyContact || event.requiresWaiver) && (
                <Card className="overflow-hidden shadow-sm">
                    <CardHeader className="bg-red-50/50 dark:bg-red-950/10 pb-4 border-b border-red-100 dark:border-red-900/30">
                        <CardTitle className="flex items-center gap-2 text-lg text-red-700 dark:text-red-400">
                            <HeartPulse className="h-5 w-5" />
                            Información Médica y Legal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            
                            {/* Columna Médica */}
                            {event.requiresEmergencyContact && (
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">Datos de Emergencia</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-muted-foreground font-medium">Contacto:</span>
                                            <span className="col-span-2 font-medium">{registration.emergencyContactName}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-muted-foreground font-medium">Teléfono:</span>
                                            <span className="col-span-2 font-mono">{registration.emergencyContactPhone}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-muted-foreground font-medium">Sangre:</span>
                                            <span className="col-span-2 font-bold text-red-600">{registration.bloodType}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-muted-foreground font-medium">Alergias:</span>
                                            <span className="col-span-2 text-orange-600 font-medium">{registration.allergies || "Ninguna"}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <span className="text-muted-foreground font-medium">Seguro:</span>
                                            <span className="col-span-2">{registration.insuranceInfo}</span>
                                        </div>
                                    </div>
                                    <div className="bg-muted p-3 rounded text-[10px] text-muted-foreground italic flex gap-2 items-start">
                                        <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" />
                                        Esta información es confidencial y solo accesible para el organizador durante el evento (se elimina 24h después).
                                    </div>
                                </div>
                            )}

                            {/* Columna Legal */}
                            {event.requiresWaiver && (
                                <div className="space-y-4 md:border-l md:pl-8">
                                    <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">Documentación Legal</h4>
                                    
                                    {registration.waiverSignature ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">
                                                <FileText className="h-5 w-5" />
                                                <div>
                                                    <p className="font-bold text-sm">Responsiva Firmada</p>
                                                    <p className="text-xs opacity-80">
                                                        Fecha: {registration.waiverAcceptedAt ? new Date(registration.waiverAcceptedAt).toLocaleDateString() : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Client-side wrapper for download logic */}
                                            <WaiverDownloadButton 
                                                registrationId={registration.id}
                                                eventName={event.name}
                                                participantName={`${user.name} ${user.lastName}`}
                                            />
                                        </div>
                                    ) : (
                                        <div className="bg-amber-50 p-3 rounded text-amber-800 text-sm">
                                            Pendiente de firma. (Generalmente se firma al completar el registro).
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* PATROCINADORES */}
            {event.sponsors && event.sponsors.length > 0 && (
                <div className="mt-8">
                    <SponsorsCarousel sponsors={event.sponsors} title="Patrocinadores del Evento" />
                </div>
            )}

        </div>

        {/* --- SIDEBAR ACTIONS --- */}
        <div className="space-y-6">
            <EventActionCard 
                event={event} 
                registration={registration} 
                ongProfile={ongProfile} 
                whatsappUrl={whatsappUrl}
                isFinished={isFinished}
            />
        </div>
      </div>
    </div>
  );
}

// Simple Alert Icon needed for medical card
function ShieldAlert(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    )
}
