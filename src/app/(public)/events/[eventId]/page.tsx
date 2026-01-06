import React from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getEvent, getAuthenticatedUser, getOngProfile, getOngCommunityCount, getUserRegistrationForEvent, incrementEventPageView } from '@/lib/data';
import { EventRegistrationCard } from '@/components/event-registration-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Clock, Trophy, Route, AlertTriangle, Users, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EventRegistration } from '@/lib/types';
import { PricingTierCard } from '@/components/pricing-tier-card';
import { SponsorsCarousel } from '@/components/shared/sponsors-carousel';
import { MobileRegistrationButton } from '@/components/public/mobile-registration-button';

type EventPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

// --- Open Graph Metadata Generation ---
export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
    const { eventId } = await params;
    const event = await getEvent(eventId);

    if (!event) {
        return {
            title: 'Evento no encontrado',
        };
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
    
    // Ensure image URL is absolute for OG tags
    let imageUrl = event.imageUrl || '/rodada-segura.png'; 
    if (imageUrl.startsWith('/')) {
        imageUrl = `${baseUrl}${imageUrl}`;
    }

    const title = `${event.name} | BiciRegistro`;
    const description = event.description 
        ? (event.description.length > 160 ? event.description.substring(0, 157) + '...' : event.description)
        : `Únete al evento ${event.name} organizado por ${event.organizerName || 'la comunidad'}.`;

    return {
        title: title,
        description: description,
        openGraph: {
            title: title,
            description: description,
            url: `${baseUrl}/events/${event.id}`,
            siteName: 'BiciRegistro',
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: event.name,
                },
            ],
            locale: 'es_MX',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: title,
            description: description,
            images: [imageUrl],
        },
    };
}

const eventTypeColors: Record<string, string> = {
  'Rodada': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  'Competencia': 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
  'Taller': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  'Conferencia': 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
};

const levelColors: Record<string, string> = {
    'Principiante': 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400',
    'Intermedio': 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400',
    'Avanzado': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400',
};

const modalityColors: Record<string, string> = {
    'default': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
};

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  const user = await getAuthenticatedUser();

  if (!event) {
    notFound();
  }

  const isAdmin = user?.role === 'admin';
  const isOwner = user?.id === event.ongId;
  
  // Allow Admin to see drafts too
  if (event.status === 'draft' && !isOwner && !isAdmin) {
     notFound();
  }

  // Increment Page Views (Fire and forget, only for published events)
  if (event.status === 'published') {
      incrementEventPageView(eventId).catch(err => console.error("Error incrementing views:", err));
  }

  const ongProfile = await getOngProfile(event.ongId);
  // Updated to use the comprehensive community count (cached)
  const followersCount = await getOngCommunityCount(event.ongId);
  
  const registration = user ? await getUserRegistrationForEvent(user.id, event.id) as EventRegistration | null : null;
  // User is considered registered ONLY if status is confirmed. 
  // If cancelled, we want them to be able to register again.
  const isRegistered = !!registration && registration.status !== 'cancelled';

  const eventDate = new Date(event.date);
  const isFinished = eventDate < new Date();
  const isSoldOut = (event.maxParticipants || 0) > 0 && (event.currentParticipants || 0) >= (event.maxParticipants || 0);

  // Define organizer name for waiver and confidence text
  const organizationName = ongProfile?.organizationName || 'el organizador';
  const waiverOrganizerName = ongProfile?.contactPerson || organizationName;


  return (
    <div className="min-h-screen bg-muted/5 pb-12">
      {/* Mobile Floating CTA */}
      <MobileRegistrationButton 
         targetId="registration-section" 
         isVisible={!isRegistered && !isFinished && !isSoldOut && event.status !== 'draft'}
         text="¡Regístrate Ahora!"
      />

      {/* Draft Warning Banner */}
      {event.status === 'draft' && (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-700 py-2 text-center sticky top-16 z-50">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm font-medium flex items-center justify-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Vista Previa (Borrador)
            </p>
        </div>
      )}

      {/* Full Width Hero Image */}
      <div className="w-full relative aspect-video md:aspect-[21/9] lg:aspect-[3/1] overflow-hidden">
         <Image 
            src={event.imageUrl || '/placeholder.svg'} 
            alt={event.name} 
            fill 
            className="object-cover" 
            priority
        />
        
        {/* Organizer Logo */}
        {ongProfile?.logoUrl && (
            <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20 bg-white/90 rounded-full p-1 shadow-lg backdrop-blur-sm">
                <div className="relative w-16 h-16 md:w-24 md:h-24">
                    <Image 
                        src={ongProfile.logoUrl} 
                        alt={`${ongProfile.organizationName} logo`}
                        fill 
                        className="object-contain"
                    />
                </div>
            </div>
        )}

        {/* Rodada Segura Badge */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20 bg-white/90 rounded-full p-1 shadow-lg backdrop-blur-sm">
            <div className="relative w-16 h-16 md:w-24 md:h-24">
                <Image 
                    src="/rodada-segura.png" 
                    alt="Distintivo Rodada Segura" 
                    fill 
                    className="object-contain"
                />
            </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent md:hidden" />
      </div>

      {/* Main Content Grid */}
      <div className="container mx-auto px-4 -mt-12 relative z-10 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Main Info Card */}
            <div className="lg:col-span-2 space-y-8">
                <Card className="shadow-lg border-t-4 border-t-primary">
                    <CardContent className="p-6 md:p-8 space-y-6">
                        {/* Badges & Title */}
                        <div className="space-y-4">
                            <div className="flex gap-2 flex-wrap">
                                <Badge className={cn("capitalize border text-sm py-1 px-3", eventTypeColors[event.eventType] || "bg-secondary")}>
                                    {event.eventType}
                                </Badge>
                                {event.modality && (
                                    <Badge variant="outline" className={cn("text-sm py-1 px-3", modalityColors['default'])}>
                                        {event.modality}
                                    </Badge>
                                )}
                                {event.level && (
                                    <Badge variant="outline" className={cn("text-sm py-1 px-3", levelColors[event.level] || modalityColors['default'])}>
                                        {event.level}
                                    </Badge>
                                )}
                            </div>
                            
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
                                {event.name}
                            </h1>
                            
                            {/* Bib Number Display for User */}
                            {isRegistered && event.bibNumberConfig?.enabled && (
                                <div className="p-4 bg-muted/30 border border-muted rounded-lg flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                                        #
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                                            Tu Número de Corredor
                                        </p>
                                        <p className="text-xl font-bold">
                                            {registration?.bibNumber ? (
                                                 <span className="text-primary font-mono text-2xl">#{registration.bibNumber}</span>
                                            ) : (
                                                 <span className="text-muted-foreground text-base italic">
                                                     {event.bibNumberConfig.mode === 'automatic' 
                                                         ? (registration?.paymentStatus === 'paid' ? 'Asignando...' : 'Completa tu pago para obtener número') 
                                                         : 'Se asignará en la entrega de kits'
                                                     }
                                                 </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Separator />

                            {/* Key Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-muted-foreground">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Fecha</p>
                                        <p className="font-medium text-foreground text-lg">
                                            {eventDate.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Hora</p>
                                        <p className="font-medium text-foreground text-lg">
                                            {eventDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Ubicación</p>
                                        <p className="font-medium text-foreground text-lg">{event.state}, {event.country}</p>
                                    </div>
                                </div>
                                
                                {event.googleMapsUrl && (
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <MapPin className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Punto de Partida</p>
                                            <Link href={event.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline text-lg flex items-center gap-1">
                                                Ver Mapa
                                            </Link>
                                        </div>
                                    </div>
                                )}

                                 {/* Distance - now handles 0 value */}
                                 {(event.distance !== undefined && event.distance !== null) && (
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <Route className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Distancia</p>
                                            <p className="font-medium text-foreground text-lg">
                                                {event.distance > 0 ? `${event.distance} km` : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Description */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">Acerca del Evento</h2>
                            <div className="prose dark:prose-invert max-w-none text-muted-foreground whitespace-pre-line leading-relaxed">
                                {event.description}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Categories Section */}
                {event.hasCategories && event.categories && event.categories.length > 0 && (
                    <div className="space-y-4 mt-8">
                        <div className="flex items-center gap-2">
                            <Trophy className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-semibold">Categorías</h2>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                            {event.categories.map((cat, idx) => (
                                <Card key={idx} className="bg-card hover:bg-accent/5 transition-colors border-muted-foreground/20 overflow-hidden flex flex-col">
                                    <CardContent className="p-4 flex-1 flex flex-col gap-3">
                                        <h3 className="font-bold text-lg text-primary leading-tight">{cat.name}</h3>
                                        
                                        <div className="space-y-2">
                                            {/* Age Range */}
                                            <div className="flex items-center gap-2 text-sm">
                                                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <span className="font-medium">
                                                    {cat.ageConfig?.isRestricted 
                                                        ? `${cat.ageConfig.minAge} a ${cat.ageConfig.maxAge} años` 
                                                        : "Edad Libre"}
                                                </span>
                                            </div>

                                            {/* Start Time (Conditional) */}
                                            {cat.startTime && (
                                                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-500 font-medium animate-in fade-in">
                                                    <Clock className="h-4 w-4 shrink-0" />
                                                    <span>Salida: {cat.startTime}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Additional Info (Conditional) */}
                                        {cat.description && (
                                            <div className="pt-2 border-t border-muted mt-auto">
                                                <p className="text-xs text-muted-foreground line-clamp-3 italic">
                                                    {cat.description}
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Cost Tiers - Replaced with PricingTierCard */}
                {event.costTiers && event.costTiers.length > 0 && (
                    <div className="space-y-4 mt-8">
                        <h2 className="text-2xl font-semibold px-2">Niveles de Acceso</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {event.costTiers.map((tier, idx) => (
                                <PricingTierCard key={idx} tier={tier} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Sponsors Section - Using Shared Component */}
                <SponsorsCarousel 
                    sponsors={event.sponsors || []} 
                    title="Evento Patrocinado Por"
                />

                {/* Organizer Card - Moved to main column bottom */}
                {ongProfile && (
                    <Card className="shadow-md bg-muted/30 border-none mt-8">
                        <CardContent className="p-6 sm:p-8">
                            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                                <Avatar className="h-20 w-20 border-4 border-background shadow-sm">
                                    <AvatarImage src={ongProfile.logoUrl} alt={ongProfile.organizationName} />
                                    <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                                        {ongProfile.organizationName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-2 flex-1">
                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Evento Organizado por</p>
                                    <h3 className="font-bold text-2xl text-foreground">{ongProfile.organizationName}</h3>
                                    <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground">
                                        <Users className="h-4 w-4" />
                                        <span className="font-medium">{followersCount}</span>
                                        <span>miembros en la comunidad</span>
                                    </div>
                                </div>
                                {ongProfile.contactWhatsapp && (
                                    <Button size="lg" variant="secondary" className="bg-green-600 text-white hover:bg-green-700 shadow-sm" asChild>
                                        <Link href={`https://wa.me/${ongProfile.contactWhatsapp}`} target="_blank" rel="noopener noreferrer">
                                            <MessageCircle className="mr-2 h-5 w-5" />
                                            Contactar
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Right Column: Sticky Sidebar for Actions */}
            <div className="space-y-6" id="registration-section">
                <EventRegistrationCard 
                    event={event} 
                    user={user} 
                    isRegistered={isRegistered}
                    organizerNameForWaiver={waiverOrganizerName}
                    organizerName={organizationName}
                />
            </div>
        </div>
      </div>
    </div>
  );
}
