import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser, getEvent, getUserRegistrationForEvent, getOngProfile } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Clock, ArrowLeft, MessageCircle, CreditCard, Tag, Trophy } from 'lucide-react';

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

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4 text-sm">
            <ArrowLeft className="h-4 w-4" /> Volver a Mi Dashboard
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-3xl font-bold">{event.name}</h1>
            <Badge variant={registration.status === 'confirmed' ? 'default' : 'secondary'} className="text-base px-3 py-1">
                {registration.status === 'confirmed' ? 'Registro Confirmado' : registration.status}
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
                    </div>
                </CardContent>
            </Card>

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
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1"><Trophy className="h-3 w-3" /> Categoría</p>
                            <p className="text-lg font-semibold">{categoryName}</p>
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
            <Card className="border-primary/20 shadow-md">
                <CardHeader>
                    <CardTitle className="text-lg">Acciones</CardTitle>
                    <CardDescription>Gestiona tu participación</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {ongProfile?.contactWhatsapp && (
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white" asChild>
                            <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Enviar Comprobante
                            </Link>
                        </Button>
                    )}
                    
                    <Button variant="outline" className="w-full" disabled>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pagar en Línea (Próximamente)
                    </Button>

                    <Button variant="ghost" className="w-full" asChild>
                        <Link href={`/events/${event.id}`}>
                            Ver Página Pública
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
