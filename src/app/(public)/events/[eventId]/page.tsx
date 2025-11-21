import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getEvent, getAuthenticatedUser, getOngProfile, getOngFollowersCount } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Clock, Trophy, Route, Tag, AlertTriangle, Users, MessageCircle } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { cn } from '@/lib/utils';

type EventPageProps = {
  params: {
    eventId: string;
  };
};

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
  const event = await getEvent(params.eventId);
  const user = await getAuthenticatedUser();

  if (!event) {
    notFound();
  }

  const isOwner = user?.id === event.ongId;
  if (event.status === 'draft' && !isOwner) {
     notFound();
  }

  const ongProfile = await getOngProfile(event.ongId);
  const followersCount = await getOngFollowersCount(event.ongId);

  const eventDate = new Date(event.date);

  // Construct callback URLs for auth flow
  const eventUrl = `/events/${params.eventId}`;
  const loginUrl = `/login?callbackUrl=${encodeURIComponent(eventUrl)}`;
  // If we want to link the user to the community on signup, we could add communityId logic here if supported by signup page via params
  const signupUrl = `/signup?callbackUrl=${encodeURIComponent(eventUrl)}`;

  return (
    <div className="min-h-screen bg-muted/5 pb-12">
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
                                 {/* Distance moved here */}
                                 {event.distance && event.distance > 0 && (
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <Route className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Distancia</p>
                                            <p className="font-medium text-foreground text-lg">{event.distance} km</p>
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
                                <Card key={idx} className="bg-card hover:bg-accent/5 transition-colors border-muted-foreground/20">
                                    <CardContent className="p-4">
                                        <h3 className="font-bold text-lg mb-1 text-primary">{cat.name}</h3>
                                        {cat.description && (
                                            <p className="text-sm text-muted-foreground">{cat.description}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Cost Tiers */}
                {event.costTiers && event.costTiers.length > 0 && (
                    <div className="space-y-4 mt-8">
                        <h2 className="text-2xl font-semibold px-2">Niveles de Acceso</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {event.costTiers.map((tier, idx) => (
                                <Card key={idx} className="border-primary/20 shadow-sm hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg font-bold text-primary">{tier.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="mb-4">
                                            <span className="text-3xl font-bold">${tier.price}</span>
                                            <span className="text-muted-foreground text-sm font-medium"> MXN</span>
                                        </div>
                                        <div className="flex gap-2 items-start text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                                            <Tag className="h-4 w-4 mt-0.5 shrink-0" />
                                            <span>{tier.includes}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Organizer Card - Moved to main column bottom */}
                {ongProfile && (
                    <Card className="shadow-md bg-muted/30 border-none mt-8">
                        <CardContent className="p-6 sm:p-8">
                            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                                <Avatar className="h-20 w-20 border-4 border-background shadow-sm">
                                    <AvatarImage src={ongProfile.avatarUrl} alt={ongProfile.organizationName} />
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
            <div className="space-y-6">
                <Card className="shadow-lg sticky top-24 z-10 border-t-4 border-t-secondary">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl">Inscripción</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        <div className="flex items-center justify-between pb-4 border-b last:border-0 last:pb-0">
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <Tag className="h-5 w-5" />
                                <span>Costo</span>
                            </div>
                            <span className="font-bold text-xl">{event.costType || 'Gratuito'}</span>
                        </div>

                        {event.googleMapsUrl && (
                            <div className="pt-2">
                                <Button variant="outline" className="w-full group border-dashed" asChild>
                                    <Link href={event.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                                        <MapPin className="mr-2 h-4 w-4 group-hover:text-red-500 transition-colors" />
                                        Ver Mapa
                                    </Link>
                                </Button>
                            </div>
                        )}

                        <div className="pt-2">
                            {user ? (
                                <>
                                    <Button size="lg" className="w-full text-lg font-bold shadow-lg shadow-primary/20 h-12" disabled={event.status === 'draft'}>
                                        {event.status === 'draft' ? 'No disponible' : 'Registrarme Ahora'}
                                    </Button>
                                    {event.status !== 'draft' && (
                                        <p className="text-xs text-center text-muted-foreground mt-3">
                                            * Confirmarás tus datos en el siguiente paso.
                                        </p>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-3">
                                    <Button size="lg" variant="outline" className="w-full font-semibold border-primary/50 hover:bg-primary/5" asChild>
                                        <Link href={loginUrl}>Iniciar Sesión</Link>
                                    </Button>
                                    <Button size="lg" className="w-full font-bold shadow-md" asChild>
                                        <Link href={signupUrl}>Crear Cuenta</Link>
                                    </Button>
                                    <p className="text-xs text-center text-muted-foreground mt-2">
                                        Para inscribirte al evento necesitas una cuenta en BiciRegistro.
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
