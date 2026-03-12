'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BikeCard } from '@/components/bike-card';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, ArrowRight, Compass, Gift, HelpCircle, FileText, PlusCircle, Share2 } from 'lucide-react';
import type { Bike, UserEventRegistration, User, Campaign, UserReward } from '@/lib/types';
import { cn } from '@/lib/utils';
import { RewardCard } from './reward-card';
import { PromotionalBanner } from './promotional-banner';
import { ReferralStatsCard } from './referral-stats-card';
import { getReferralData, ReferralData } from '@/lib/actions/referral-actions';
import { useToast } from '@/hooks/use-toast';

interface DashboardTabsProps {
    bikes: Bike[];
    registrations: UserEventRegistration[];
    user: User;
    isProfileComplete: boolean;
    // New Props for Rewards
    activeRewards?: (Campaign & { advertiserName?: string })[];
    userPurchases?: UserReward[];
}

function DashboardTabsContent({ bikes, registrations, isProfileComplete, user, activeRewards = [], userPurchases = [] }: DashboardTabsProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const [referralData, setReferralData] = useState<ReferralData | null>(null);

    // Default Tab Logic
    let initTab = 'garage';
    const paramTab = searchParams.get('tab');
    if (paramTab === 'events' || paramTab === 'rewards') initTab = paramTab;

    const [activeTab, setActiveTab] = useState(initTab);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'events' || tab === 'garage' || tab === 'rewards') {
            setActiveTab(tab);
        }
    }, [searchParams]);

    // Fetch referral data for the floating button sharing
    useEffect(() => {
        if (activeTab === 'rewards') {
            getReferralData().then((res) => {
                if (res.success && res.data) {
                    setReferralData(res.data);
                }
            });
        }
    }, [activeTab]);

    const onTabChange = (value: string) => {
        setActiveTab(value);
        router.push(`${pathname}?tab=${value}`, { scroll: false });
    };

    const handleShare = async () => {
        if (!referralData) return;

        const shareText = `¡Hola! Te invito a usar mi enlace para blindar tu bici con *Biciregistro*, proteger a la banda ciclista del robo y combatir el mercado negro. Si te registras con mi link ambos podemos ganar premios de aliados y acumular kilómetros.\n\nMi link 👉 ${referralData.shareUrl}\n\n¡Además, le das identidad a tu bici, la vinculas legalmente a ti y obtienes herramientas de protección activa y pasiva contra el robo!`;
        
        const shareData = {
            title: 'Únete a BiciRegistro',
            text: shareText,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Error sharing:', err);
                navigator.clipboard.writeText(shareText);
            }
        } else {
            navigator.clipboard.writeText(shareText);
            toast({
                title: "Mensaje copiado",
                description: "El mensaje de invitación ha sido copiado al portapapeles.",
            });
        }
    };


    const now = new Date();
    const sortedRegistrations = [...registrations].sort((a, b) => {
        const dateA = new Date(a.event.date);
        const dateB = new Date(b.event.date);
        const isFinishedA = dateA < now;
        const isFinishedB = dateB < now;
        if (!isFinishedA && isFinishedB) return -1;
        if (isFinishedA && !isFinishedB) return 1;
        if (!isFinishedA && !isFinishedB) return dateA.getTime() - dateB.getTime();
        return dateB.getTime() - dateA.getTime();
    });

    // Reward Data Logic
    const pointsBalance = user.gamification?.pointsBalance || 0;
    const activeCampaignIds = new Set(activeRewards.map(r => r.id));
    const unredeemedPurchases = userPurchases.filter(ur => ur.status === 'purchased');
    
    const combinedRewardsList = [...activeRewards];
    unredeemedPurchases.forEach(ur => {
        if (!activeCampaignIds.has(ur.campaignId)) {
             combinedRewardsList.push({
                 id: ur.campaignId,
                 title: ur.campaignSnapshot.title,
                 advertiserId: ur.advertiserId,
                 advertiserName: ur.campaignSnapshot.advertiserName,
                 bannerImageUrl: ur.campaignSnapshot.bannerImageUrl,
                 description: ur.campaignSnapshot.description,
                 conditions: ur.campaignSnapshot.conditions,
                 endDate: ur.campaignSnapshot.endDate,
                 priceKm: ur.pricePaidKm,
                 internalName: 'Legacy',
                 type: 'reward',
                 status: 'ended', 
                 placement: 'event_list',
                 clickCount: 0,
                 uniqueConversionCount: 0,
                 createdAt: ur.purchasedAt,
                 updatedAt: ur.purchasedAt
             } as Campaign & { advertiserName?: string });
             activeCampaignIds.add(ur.campaignId);
        }
    });

    return (
        <Tabs id="tour-garage" value={activeTab} onValueChange={onTabChange} className="w-full relative">
            {/* Desktop Tabs List - Hidden on mobile, replaced by bottom nav */}
            <TabsList className="hidden md:grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="garage">Mi Garaje ({bikes.length})</TabsTrigger>
                <TabsTrigger value="events">Mis Eventos</TabsTrigger>
                <TabsTrigger value="rewards" className="relative">
                    Mis Recompensas
                    {unredeemedPurchases.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 text-[10px] items-center justify-center text-white">
                              {unredeemedPurchases.length}
                          </span>
                        </span>
                    )}
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value="garage" className="space-y-4">
                {/* Desktop: Show promotional banner at top. */}
                <div className="hidden md:block mb-6">
                    <PromotionalBanner />
                </div>

                {bikes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-xl bg-muted/30">
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                            <PlusCircle className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight mb-2">No tienes bicicletas registradas</h3>
                        <p className="text-muted-foreground max-w-sm mb-8">
                            {isProfileComplete
                                ? 'Crea el ADN Digital de tu bicicleta para protegerla y tener acceso a la comunidad de BiciRegistro.'
                                : 'Completa tu perfil en la sección correspondiente para poder registrar tu primera bicicleta.'
                            }
                        </p>
                        
                        {isProfileComplete ? (
                            <Button asChild size="lg" className="w-full sm:w-auto font-semibold">
                                <Link href="/dashboard/register">Registrar Bici Ahora</Link>
                            </Button>
                        ) : (
                             <Button asChild size="lg" className="w-full sm:w-auto font-semibold">
                                <Link href="/dashboard/profile">Ir a Completar Perfil</Link>
                            </Button>
                        )}
                        
                        <Button variant="link" asChild className="mt-4 text-muted-foreground min-h-[44px]">
                             <Link href="/faqs" className="flex items-center gap-2">
                                 <HelpCircle className="h-4 w-4" />
                                 <span>¿Por qué debo registrar mi bici?</span>
                             </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 pb-28 md:pb-0"> {/* Extra padding for the bottom button on mobile */}
                        {/* Mobile: Inject promotional banner at the TOP of the feed before any bikes */}
                        <div className="md:hidden">
                            <PromotionalBanner />
                        </div>
                        
                        {bikes.map((bike: Bike) => (
                            <div key={bike.id}>
                                <BikeCard bike={bike} user={user} />
                            </div>
                        ))}
                        
                        {/* Mobile prominently centered add bike button */}
                        <div id="tour-main-action" className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
                             {isProfileComplete ? (
                                <Button asChild className="h-12 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-white font-bold px-6">
                                    <Link href="/dashboard/register" className="flex items-center gap-2">
                                        <PlusCircle className="h-5 w-5" />
                                        <span>Agregar Bici</span>
                                    </Link>
                                </Button>
                             ) : (
                                <Button disabled className="h-12 rounded-full shadow-xl opacity-50 font-bold px-6 flex items-center gap-2">
                                    <PlusCircle className="h-5 w-5" />
                                    <span>Agregar Bici</span>
                                </Button>
                             )}
                        </div>
                    </div>
                )}
            </TabsContent>
            
            <TabsContent value="events" className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-xl font-semibold hidden sm:block">Mis Eventos</h2>
                    <Button asChild className="w-full sm:w-auto">
                        <Link href="/events">
                            <Compass className="mr-2 h-4 w-4" />
                            Explorar eventos
                        </Link>
                    </Button>
                </div>

                {!isProfileComplete ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-amber-200 rounded-xl bg-amber-50/50">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                            <Calendar className="h-8 w-8 text-amber-600" />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight mb-2 text-amber-800">Perfil Incompleto</h3>
                        <p className="text-amber-700/80 max-w-sm mb-6">
                            Para poder registrarte en eventos y firmar las responsivas de los organizadores aliados, primero debes completar tu perfil.
                        </p>
                        <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white">
                            <Link href="/dashboard/profile">Completar Perfil Ahora</Link>
                        </Button>
                    </div>
                ) : registrations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-xl bg-muted/30">
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                            <Calendar className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight mb-2">No tienes eventos próximos</h3>
                        <p className="text-muted-foreground max-w-sm mb-8">
                            Aún no te has registrado en ningún evento. Explora las rodadas y competencias de nuestros organizadores aliados.
                        </p>
                        <Button asChild size="lg" className="w-full sm:w-auto font-semibold">
                            <Link href="/events">Ver Eventos Disponibles</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                         {sortedRegistrations.map((reg) => {
                            const eventDate = new Date(reg.event.date);
                            const isFinished = eventDate < now;
                            let badgeText = reg.status === 'confirmed' ? 'Confirmado' : reg.status;
                            let badgeClassName = "text-xs shrink-0";
                            let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";

                            if (isFinished) {
                                badgeText = "Finalizado";
                                badgeClassName = cn(badgeClassName, "bg-slate-500 text-white hover:bg-slate-600 border-transparent");
                            } else if (reg.status === 'confirmed') {
                                if (reg.event.costType === 'Con Costo') {
                                    if (reg.paymentStatus === 'paid') {
                                        badgeText = "Pagado";
                                        badgeClassName = cn(badgeClassName, "bg-green-600 hover:bg-green-700 text-white border-transparent");
                                    } else {
                                        badgeText = "Pago Pendiente";
                                        badgeClassName = cn(badgeClassName, "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200");
                                    }
                                } else {
                                    badgeText = "Confirmado";
                                    badgeClassName = cn(badgeClassName, "bg-green-100 text-green-800 border-green-200");
                                }
                            } else {
                                badgeVariant = "destructive";
                            }

                            return (
                                <Card key={reg.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                    <CardContent className="p-0">
                                        <div className="flex flex-row h-full"> {/* Mobile format: List Item */}
                                            <div className="w-24 sm:w-32 bg-muted flex-shrink-0 relative">
                                                {reg.event.imageUrl ? (
                                                    <img src={reg.event.imageUrl} alt={reg.event.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                        <Calendar className="h-8 w-8" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start gap-2 mb-1">
                                                        <h3 className="font-bold text-sm sm:text-lg line-clamp-2 leading-tight">{reg.event.name}</h3>
                                                        <Badge variant={badgeVariant} className={cn(badgeClassName, "hidden sm:inline-flex")}>
                                                            {badgeText}
                                                        </Badge>
                                                    </div>
                                                    <Badge variant={badgeVariant} className={cn(badgeClassName, "sm:hidden mb-2 self-start")}>
                                                        {badgeText}
                                                    </Badge>
                                                    <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3 flex-shrink-0" />
                                                            <span className="truncate">{eventDate.toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <MapPin className="h-3 w-3 flex-shrink-0" />
                                                            <span className="truncate">{reg.event.state}, {reg.event.country}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex justify-between items-center">
                                                    {/* Quick highlight for waiver status */}
                                                    <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                                        <FileText className="w-3 h-3 mr-1" />
                                                        <span className="hidden sm:inline">Liberación Firmada</span>
                                                        <span className="sm:hidden">Firmado</span>
                                                    </div>
                                                    <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80 p-0 h-auto">
                                                        <Link href={`/dashboard/events/${reg.eventId}`} className="flex items-center gap-1">
                                                            Detalles <ArrowRight className="h-3 w-3" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </TabsContent>

            <TabsContent value="rewards" className="space-y-4 pb-28 md:pb-0"> {/* Use pb-28 to avoid overlapping the new floating button on mobile */}
                {/* Desktop: Green Points Card. Mobile: Hidden. */}
                <div className="hidden md:block bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2 text-white">
                                <Gift className="w-6 h-6" /> Mis Recompensas
                            </h2>
                            <p className="text-emerald-50/90 text-sm max-w-xl">
                                Canjea tus Kilómetros (KM) acumulados por beneficios exclusivos de aliados.
                            </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 px-6 flex items-center gap-4 border border-white/20 shadow-inner">
                            <div className="text-right">
                                <span className="block text-emerald-100/80 text-[10px] uppercase tracking-widest font-bold">Saldo Disponible</span>
                                <span className="text-3xl font-black font-mono leading-none">{pointsBalance} KM</span>
                            </div>
                            <div className="h-10 w-px bg-white/20"></div>
                            <Gift className="w-8 h-8 text-emerald-200/50" />
                        </div>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl mix-blend-overlay"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-emerald-300 opacity-10 rounded-full blur-2xl mix-blend-overlay"></div>
                </div>

                {/* Referral Card (Gamification Explanation) */}
                {isProfileComplete && (
                    <div className="mb-6">
                        <ReferralStatsCard user={user} />
                    </div>
                )}

                {/* Rewards List */}
                {combinedRewardsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-xl bg-muted/30">
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                            <Gift className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight mb-2">Próximamente más beneficios</h3>
                        <p className="text-muted-foreground max-w-sm mb-6">
                            Sigue acumulando KM reportando robos o invitando amigos para canjearlos por productos y servicios en el futuro.
                        </p>
                        <Button variant="link" asChild className="text-muted-foreground min-h-[44px]">
                             <Link href="/faqs" className="flex items-center gap-2">
                                 <HelpCircle className="h-4 w-4" />
                                 <span>¿Cómo acumulo más KM?</span>
                             </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {combinedRewardsList.map((campaign) => (
                            <RewardCard 
                                key={campaign.id} 
                                campaign={campaign} 
                                userPoints={pointsBalance}
                                userPurchases={userPurchases}
                            />
                        ))}
                    </div>
                )}

                {/* Mobile prominently centered Share / Invite button */}
                {isProfileComplete && (
                    <div id="tour-main-action" className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
                        <Button 
                            onClick={handleShare}
                            className="h-12 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-white font-bold px-6 flex items-center gap-2"
                        >
                            <Share2 className="h-5 w-5" />
                            <span>Invitar Amigos</span>
                        </Button>
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}

export function DashboardTabs(props: DashboardTabsProps) {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <DashboardTabsContent {...props} />
        </Suspense>
    );
}
