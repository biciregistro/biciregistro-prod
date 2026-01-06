import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser, getEvent, getUserRegistrationForEvent, getOngProfile, getBikes } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Clock, ArrowLeft, Tag, Trophy, Hash, AlertCircle, CheckCircle2, Package, User, Phone, Globe, HeartPulse, FileText, Download, Shirt, TriangleAlert, ShieldCheck, QrCode } from 'lucide-react';
import { EventActionCard } from '@/components/dashboard/event-action-card';
import { EventBikeSelector } from '@/components/dashboard/event-bike-selector';
import { PaymentStatusHandler } from '@/components/payment-status-handler';
import { SponsorsCarousel } from '@/components/shared/sponsors-carousel';
import { PaymentTimerBanner } from '@/components/dashboard/payment-timer-banner';
import { FloatingPaymentButton } from '@/components/dashboard/floating-payment-button';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Registration QR Component (Client Component) - Renamed file import
import { RegistrationQRCode } from '@/components/dashboard/RegistrationQrCode';

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

  let badgeText = registration.status === 'confirmed' ? 'Confirmado' : registration.status;
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" = registration.status === 'confirmed' ? 'default' : 'secondary';
  let badgeClassName = "text-xs px-2 py-0.5 capitalize";

  const isPendingPayment = event.costType === 'Con Costo' && registration.paymentStatus === 'pending' && registration.status === 'confirmed';
  const isPaid = registration.status === 'confirmed' && (event.costType === 'Gratuito' || registration.paymentStatus === 'paid');

  if (isFinished) {
      badgeText = "Finalizado";
      badgeClassName = cn(badgeClassName, "bg-slate-500 text-white border-transparent");
      badgeVariant = "secondary";
  } else if (registration.status === 'confirmed') {
      if (event.costType === 'Con Costo') {
          if (registration.paymentStatus === 'paid') {
              badgeText = "Pagado";
              badgeClassName = cn(badgeClassName, "bg-green-600 text-white border-transparent");
          } else {
              badgeText = "Pago Pendiente";
              badgeVariant = "secondary";
              badgeClassName = cn(badgeClassName, "bg-yellow-100 text-yellow-800 border-yellow-200");
          }
      }
  }

  const showBibNumber = event.bibNumberConfig?.enabled;
  const userPhone = user.phone || user.whatsapp;
  const isProfileComplete = !!(userPhone && user.city && user.state && user.country);

  return (
    <div className="container max-w-4xl mx-auto py-6 md:py-10 px-4">
      <PaymentStatusHandler />
      
      {/* Mobile Floating Payment CTA */}
      {isPendingPayment && !isFinished && (
          <FloatingPaymentButton 
            eventId={event.id} 
            registrationId={registration.id} 
            price={price} 
          />
      )}

      {/* TICKET DIGITAL PRINCIPAL */}
      <div className="max-w-2xl mx-auto">
        <Card className="overflow-hidden border-none shadow-2xl relative bg-card ticket-shape">
            {/* Cabecera del Ticket */}
            <div className="bg-primary text-primary-foreground p-6 md:p-8 space-y-4">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-80">Ticket de Inscripción</p>
                        <h1 className="text-2xl md:text-3xl font-black leading-tight uppercase italic text-white">{event.name}</h1>
                    </div>
                    <Badge className={cn("text-sm py-1 px-3 bg-white text-primary border-none shadow-sm", badgeClassName)}>
                        {badgeText}
                    </Badge>
                </div>
                
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs md:text-sm font-medium opacity-90">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>{eventDate.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        <span className="line-clamp-1">{event.state}, {event.country}</span>
                    </div>
                </div>
            </div>

            <CardContent className="p-0">
                {/* 0. BLOQUE CONDICIONAL: BLINDAJE o PAGO PENDIENTE */}
                {isPaid ? (
                    <div className="p-6 md:p-8 bg-blue-50/50 dark:bg-blue-900/10 space-y-4">
                        <div className="flex gap-4">
                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                <ShieldCheck className="h-7 w-7" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-blue-900 dark:text-blue-300">A partir de este momento tú y tu bicicleta están blindados para el evento.</h3>
                                <p className="text-sm text-blue-800/80 dark:text-blue-400 leading-relaxed">
                                    Tu Pasaporte Ciclista ya está activo. Presenta este ticket digital en el check-in. 
                                    <span className="block mt-1 font-semibold">Recuerda: este evento protege tu patrimonio. Al terminar, nuestro staff validará tu identidad para que tu bici regrese segura a casa contigo.</span>
                                </p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <Button variant="outline" asChild className="w-full text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 font-medium">
                                <Link href="/dashboard">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver a mi Garage
                                </Link>
                            </Button>
                        </div>
                    </div>
                ) : isPendingPayment ? (
                    <div className="p-6 md:p-8 bg-amber-50/50 dark:bg-amber-900/10 space-y-4">
                        {/* Remove default margin from PaymentTimerBanner inside here */}
                        <div className="[&>div]:mb-0 [&>div]:shadow-sm">
                            <PaymentTimerBanner registrationDate={registration.registrationDate} />
                        </div>
                        
                        <div className="flex gap-4 pt-2">
                            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                <ShieldCheck className="h-7 w-7 opacity-50" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-amber-900 dark:text-amber-300">Tu blindaje está en pausa.</h3>
                                <p className="text-sm text-amber-800/80 dark:text-amber-400 leading-relaxed">
                                    Completa tu pago para activar tu Pasaporte Ciclista y asegurar la protección de tu bicicleta durante el evento.
                                </p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <Button variant="outline" asChild className="w-full text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800 font-medium">
                                <Link href="/dashboard">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver a mi Garage
                                </Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    // Fallback for cancelled or other states
                    <div className="p-4 flex justify-end">
                         <Button variant="ghost" size="sm" asChild>
                            <Link href="/dashboard">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                            </Link>
                        </Button>
                    </div>
                )}

                <Separator className="border-dashed border-muted-foreground/30" />

                {/* 1. SECCIÓN PASAPORTE CICLISTA */}
                <div className="p-6 md:p-8 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2">
                             <Hash className="h-5 w-5 text-primary" /> Pasaporte Ciclista
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                         {/* Dorsal Destacado */}
                         {showBibNumber && (
                            <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-xl border border-dashed border-primary/20 aspect-square max-w-[150px] mx-auto md:mx-0">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Dorsal</p>
                                {registration.bibNumber ? (
                                    <span className="text-5xl font-black text-primary font-mono tracking-tighter">
                                        #{registration.bibNumber.toString().padStart(3, '0')}
                                    </span>
                                ) : (
                                    <span className="text-sm text-center text-amber-600 font-medium">PENDIENTE</span>
                                )}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Nombre del Ciclista</p>
                                <p className="text-xl font-black uppercase">{user.name} {user.lastName}</p>
                                
                                {/* ALERTA PERFIL INCOMPLETO (CA1) - MODIFIED FOR CONSISTENCY */}
                                {!isProfileComplete && (
                                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex flex-col space-y-3 animate-in fade-in">
                                        <div className="flex gap-3">
                                            <TriangleAlert className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <h4 className="font-bold text-yellow-900 leading-tight text-sm">
                                                    Perfil Incompleto
                                                </h4>
                                                <p className="text-xs text-yellow-800 leading-relaxed">
                                                    Para completar tu registro y asegurar tu lugar, necesitamos tus datos de contacto.
                                                </p>
                                            </div>
                                        </div>
                                        <Button size="sm" className="w-full bg-yellow-600 hover:bg-yellow-700 text-white border-none shadow-sm" asChild>
                                            <Link href={`/dashboard/profile?returnTo=/dashboard/events/${event.id}`}>
                                                Completar Perfil
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Nivel</p>
                                    <p className="font-bold text-sm">{tierName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Categoría</p>
                                    <p className="font-bold text-sm">{categoryName}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className="border-dashed border-muted-foreground/30" />

                {/* 2. SECCIÓN BICICLETA */}
                <div className="p-6 md:p-8 bg-muted/5">
                     <h3 className="text-lg font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" /> Bicicleta Blindada
                    </h3>
                    {!isFinished ? (
                        <EventBikeSelector userBikes={userBikes} registration={registration} eventId={event.id} />
                    ) : (
                         <div className="p-4 border rounded-lg bg-background">
                            <p className="text-lg font-bold">
                                {userBikes.find(b => b.id === registration.bikeId)?.make} {userBikes.find(b => b.id === registration.bikeId)?.model}
                            </p>
                            <p className="text-sm font-mono text-muted-foreground">
                                Serie: {userBikes.find(b => b.id === registration.bikeId)?.serialNumber}
                            </p>
                        </div>
                    )}
                </div>

                {/* 3. SECCIÓN INFORMACIÓN ADICIONAL (MÉDICA Y LEGAL) - INTEGRADA */}
                {(event.requiresEmergencyContact || event.requiresWaiver) && (
                    <>
                        <Separator className="border-dashed border-muted-foreground/30" />
                        <div className="p-6 md:p-8">
                            <h3 className="text-lg font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                                <HeartPulse className="h-5 w-5 text-primary" /> Información Adicional
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                                {event.requiresEmergencyContact && (
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-muted-foreground text-xs uppercase tracking-wide">Datos de Emergencia</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between border-b pb-1 border-dashed border-muted-foreground/20">
                                                <span className="text-muted-foreground">Contacto:</span>
                                                <span className="font-medium">{registration.emergencyContactName}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-1 border-dashed border-muted-foreground/20">
                                                <span className="text-muted-foreground">Teléfono:</span>
                                                <span className="font-mono">{registration.emergencyContactPhone}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-1 border-dashed border-muted-foreground/20">
                                                <span className="text-muted-foreground">Sangre:</span>
                                                <span className="font-bold text-red-600">{registration.bloodType}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-1 border-dashed border-muted-foreground/20">
                                                <span className="text-muted-foreground">Alergias:</span>
                                                <span className="font-medium">{registration.allergies || "Ninguna"}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {event.requiresWaiver && registration.waiverSignature && (
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-muted-foreground text-xs uppercase tracking-wide">Documentación Legal</h4>
                                        <div className="bg-muted/30 p-4 rounded-lg flex items-center justify-between border border-muted">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-primary" />
                                                <span className="font-medium">Carta Responsiva</span>
                                            </div>
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px]">FIRMADA</Badge>
                                        </div>
                                        <div className="flex justify-end">
                                            <WaiverDownloadButton 
                                                registrationId={registration.id}
                                                eventName={event.name}
                                                participantName={`${user.name} ${user.lastName}`}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                <Separator className="border-dashed border-muted-foreground/30" />

                {/* 4. SECCIÓN CHECK-IN (QR) */}
                <div className="p-8 bg-muted/20 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-3 flex-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            <QrCode className="h-3 w-3" /> Check-in Digital
                        </div>
                        <h4 className="text-xl font-black">Escanea en la entrada</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                            Presenta este código al staff del evento para validar tu asistencia y el blindaje de tu bicicleta.
                        </p>
                        {isPendingPayment && (
                             <p className="text-xs text-destructive font-bold animate-pulse">
                                * PAGO PENDIENTE: Completa tu pago para activar el Check-in.
                             </p>
                        )}
                    </div>
                    
                    <div className="shrink-0 shadow-xl p-2 bg-white rounded-xl border-4 border-primary/20">
                        <RegistrationQRCode registrationId={registration.id} />
                    </div>
                </div>
            </CardContent>
            
            {/* Pie del Ticket decorativo */}
            <div className="h-4 bg-primary flex items-center justify-center gap-2 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="h-1 w-8 bg-primary-foreground/20 rounded-full" />
                ))}
            </div>
        </Card>
      </div>

      {/* --- OTRAS ACCIONES (Fuera del Ticket) --- */}
      <div className="max-w-2xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <EventActionCard 
                event={event} 
                registration={registration} 
                ongProfile={ongProfile} 
                whatsappUrl={whatsappUrl}
                isFinished={isFinished}
            />
      </div>

      {/* PATROCINADORES */}
      {event.sponsors && event.sponsors.length > 0 && (
          <div className="max-w-2xl mx-auto mt-12">
              <SponsorsCarousel sponsors={event.sponsors} title="Patrocinadores" />
          </div>
      )}
    </div>
  );
}
