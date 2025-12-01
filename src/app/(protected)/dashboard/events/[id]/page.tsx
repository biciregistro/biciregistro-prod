import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser, getEvent, getUserRegistrationForEvent, getOngProfile, getBikes } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Clock, ArrowLeft, Tag, Trophy } from 'lucide-react';
import { EventActionCard } from '@/components/dashboard/event-action-card';
import { EventBikeSelector } from '@/components/dashboard/event-bike-selector';
import { PaymentStatusHandler } from '@/components/payment-status-handler';
import { cn } from '@/lib/utils';

export default async function EventRegistrationDetailsPage({ params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser();

  if (!user) redirect('/login');

  const eventId = params.id;
  const event = await getEvent(eventId);

  if (!event) notFound();

  const registration = await getUserRegistrationForEvent(user.id, eventId);

  if (!registration) {
      // If user is not registered, redirect to public event page or dashboard
      redirect(`/events/${eventId}`);
  }

  const ongProfile = await getOngProfile(event.ongId);
  const eventDate = new Date(event.date);
  const now = new Date();
  const isFinished = eventDate < now;
  const userBikes = await getBikes(user.id);

  // Resolve names from IDs if they are not stored in registration (which they currently aren't fully reliable)
  // But for now we use what we have or map from event
  const tier = event.costTiers?.find(t => t.id === registration.tierId);
  const category = event.categories?.find(c => c.id === registration.categoryId);

  const tierName = tier ? tier.name : (event.costType === 'Gratuito' ? 'Gratuito' : 'N/A');
  const categoryName = category ? category.name : 'N/A';
  const price = tier ? tier.price : 0;

  const whatsappMessage = `Hola Soy ${user.name}, me inscribí al evento ${event.name}, en la categoría ${categoryName} y en el nivel ${tierName}. Te comparto mi comprobante.`;
  const whatsappUrl = ongProfile?.contactWhatsapp 
    ? `https://wa.me/${ongProfile.contactWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`
    : '#';

  // --- Lógica de Estado Visual (Badge) ---
  let badgeText = registration.status === 'confirmed' ? 'Registro Confirmado' : registration.status;
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = registration.status === 'confirmed' ? 'default' : 'secondary';
  // Clases base para el badge
  let badgeClassName = "text-base px-3 py-1 capitalize";

  if (isFinished) {
      badgeText = "Evento Finalizado";
      badgeClassName = cn(badgeClassName, "bg-slate-500 text-white hover:bg-slate-600 border-transparent");
      badgeVariant = "secondary";
  } else if (registration.status === 'confirmed') {
      if (event.costType === 'Con Costo') {
          if (registration.paymentStatus === 'paid') {
              badgeText = "Registro Confirmado y Pagado";
              // Verde explícito para éxito de pago
              badgeClassName = cn(badgeClassName, "bg-green-600 hover:bg-green-700 text-white border-transparent");
          } else {
              badgeText = "Pago Pendiente";
              badgeVariant = "secondary";
              // Amarillo para alerta/pendiente
              badgeClassName = cn(badgeClassName, "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200");
          }
      }
      // Si es gratuito, se queda con el default (Registro Confirmado, variant default)
  } else if (registration.status === 'cancelled') {
      badgeText = "Cancelado";
      badgeVariant = "destructive"; // O secondary, según preferencia, pero destructive es claro
  }

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

            {/* Bike Selector Card - Conditionally Rendered */}
            {event.requiresBike !== false && !isFinished && (
                <EventBikeSelector userBikes={userBikes} registration={registration} eventId={event.id} />
            )}
            
            {/* Bike Selector Card - Read Only for Finished Events */}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1"><Tag className="h-3 w-3" /> Nivel de Acceso</p>
                            <p className="text-lg font-semibold">{tierName}</p>
                            {price > 0 && <p className="text-sm font-medium text-primary">${price} MXN</p>}
                            
                            {tier?.includes && (
                                <div className="mt-2 p-2 bg-muted rounded-md">
                                    <p className="text-xs font-semibold mb-1">Incluye (Kit):</p>
                                    <p className="text-xs text-muted-foreground">{tier.includes}</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1"><Trophy className="h-3 w-3" /> Categoría</p>
                            <p className="text-lg font-semibold">{categoryName}</p>
                            
                            {category?.description && (
                                <div className="mt-2 p-2 bg-muted rounded-md">
                                    <p className="text-xs font-semibold mb-1">Detalles:</p>
                                    <p className="text-xs text-muted-foreground">{category.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                        <p className="text-sm font-semibold mb-2">Información de Pago del Organizador:</p>
                        {event.paymentDetails ? (
                            <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-line">
                                {event.paymentDetails}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Este evento es gratuito o el pago se realiza en sitio.</p>
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
