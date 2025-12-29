import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser, getEvent, getUserRegistrationForEvent, getOngProfile, getBikes } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Clock, ArrowLeft, Tag, Trophy, Hash, AlertCircle, CheckCircle2, Package } from 'lucide-react';
import { EventActionCard } from '@/components/dashboard/event-action-card';
import { EventBikeSelector } from '@/components/dashboard/event-bike-selector';
import { PaymentStatusHandler } from '@/components/payment-status-handler';
import { cn } from '@/lib/utils';

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

  const tierName = tier ? tier.name : (event.costType === 'Gratuito' ? 'Gratuito' : 'N/A');
  const categoryName = category ? category.name : 'N/A';
  const price = tier ? tier.price : 0;

  const whatsappMessage = `Hola Soy ${user.name}, me inscribí al evento ${event.name}, en la categoría ${categoryName} y en el nivel ${tierName}. Te comparto mi comprobante.`;
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

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <PaymentStatusHandler />
      
      <div className="mb-6">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4 text-sm">
            <ArrowLeft className="h-4 w-4" /> Volver a Mi Dashboard
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-3xl font-bold">{event.name}</h1>
            <Badge variant={badgeVariant} className={badgeClassName}>
                {badgeText}
            </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Details Column */}
        <div className="md:col-span-2 space-y-6">
            
            {/* Event Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Detalles del Evento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase text-muted-foreground">Fecha</p>
                                <p className="font-medium">{eventDate.toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Clock className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase text-muted-foreground">Hora</p>
                                <p className="font-medium">{eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 sm:col-span-2">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <MapPin className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase text-muted-foreground">Ubicación</p>
                                <p className="font-medium">{event.state}, {event.country}</p>
                            </div>
                        </div>
                        
                        {event.googleMapsUrl && (
                            <div className="flex items-center gap-3 sm:col-span-2">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase text-muted-foreground">Punto de Partida</p>
                                    <Link href={event.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                                        Ver en Google Maps
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Bike Selector Card */}
            {event.requiresBike !== false && !isFinished && (
                <EventBikeSelector userBikes={userBikes} registration={registration} eventId={event.id} />
            )}
            
            {event.requiresBike !== false && isFinished && registration.bikeId && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Bicicleta Registrada</CardTitle>
                        <CardDescription>La bicicleta que usaste en este evento.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-medium">
                            {userBikes.find(b => b.id === registration.bikeId)?.make} {userBikes.find(b => b.id === registration.bikeId)?.model}
                        </p>
                         <p className="text-xs text-muted-foreground">
                            Serie: {userBikes.find(b => b.id === registration.bikeId)?.serialNumber}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Registration Details Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Tu Inscripción</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className={cn("grid grid-cols-1 gap-4", showBibNumber ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                        {/* 1. Nivel de Acceso */}
                        <div className="flex flex-col border rounded-lg p-4 bg-card shadow-sm">
                            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1"><Tag className="h-3 w-3" /> Nivel de Acceso</p>
                            <p className="text-lg font-semibold">{tierName}</p>
                            {price > 0 && <p className="text-sm font-medium text-primary mb-2">${price} MXN</p>}
                            
                            {tier?.includes && (
                                <div className="mt-auto pt-2 border-t text-xs">
                                    <span className="font-semibold mb-1 text-muted-foreground flex items-center gap-1">
                                        <Package className="h-3 w-3" /> Incluye:
                                    </span>
                                    <span className="text-foreground">{tier.includes}</span>
                                </div>
                            )}
                        </div>

                        {/* 2. Categoría */}
                        <div className="flex flex-col border rounded-lg p-4 bg-card shadow-sm">
                            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1"><Trophy className="h-3 w-3" /> Categoría</p>
                            <p className="text-lg font-semibold mb-2">{categoryName}</p>
                            
                            {category?.description && (
                                <div className="mt-auto pt-2 border-t text-xs">
                                    <span className="font-semibold block mb-0.5 text-muted-foreground">Detalles:</span>
                                    <span className="text-foreground">{category.description}</span>
                                </div>
                            )}
                        </div>

                        {/* 3. Número de Corredor */}
                        {showBibNumber && (
                            <div className="flex flex-col border rounded-lg p-4 bg-card shadow-sm relative overflow-hidden">
                                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                    <Hash className="h-3 w-3" /> No. Corredor
                                </p>
                                
                                {registration.bibNumber ? (
                                    <div className="flex flex-col items-center justify-center flex-1 py-2">
                                        <p className="text-5xl font-mono font-bold tracking-tighter text-primary leading-none">
                                            #{registration.bibNumber.toString().padStart(3, '0')}
                                        </p>
                                        <div className="flex items-center gap-1 mt-2 text-green-600 text-xs font-medium">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Asignado
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-auto bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 rounded-md">
                                        <div className="flex gap-2">
                                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                            {event.bibNumberConfig!.mode === 'automatic' ? (
                                                registration.paymentStatus === 'paid' ? (
                                                    <p className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-tight">Asignando tu número...</p>
                                                ) : (
                                                    <p className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-tight">Completa tu pago para obtener tu número.</p>
                                                )
                                            ) : (
                                                <p className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-tight">Se asignará en entrega de kits.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <Separator />
                    
                    <div>
                        <p className="text-sm font-semibold mb-2">Información de Pago del Organizador:</p>
                        {event.paymentDetails ? (
                            <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-line">
                                {event.paymentDetails}
                            </div>
                        ) : (
                             event.costType === 'Gratuito' ? (
                                <p className="text-sm text-muted-foreground">Este evento es gratuito.</p>
                             ) : (
                                <p className="text-sm text-muted-foreground">Puedes realizar tu pago a través de las opciones disponibles.</p>
                             )
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Actions Sidebar */}
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
