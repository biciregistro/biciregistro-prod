'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BikeCard } from '@/components/bike-card';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, ArrowRight, Compass, Gift, HelpCircle, FileText, PlusCircle, Share2, Coins, ChevronRight, Info, AlertTriangle, UserCircle } from 'lucide-react';
import type { Bike, UserEventRegistration, User, Campaign, UserReward } from '@/lib/types';
import { cn } from '@/lib/utils';
import { RewardCard } from './reward-card';
import { PromotionalBanner } from './promotional-banner';
import { ReferralStatsCard } from './referral-stats-card';
import { getReferralData, ReferralData } from '@/lib/actions/referral-actions';
import { useToast } from '@/hooks/use-toast';
import { GamificationRulesSheet } from './gamification-rules-sheet';

interface DashboardTabsProps {
    bikes: Bike[];
    registrations: UserEventRegistration[];
    user: User;
    isProfileComplete: boolean;
    activeRewards?: (Campaign & { advertiserName?: string })[];
    userPurchases?: UserReward[];
}

/**
 * Helper component for mobile horizontal scroll lanes
 */
function MobileRewardLane({ title, items, userPoints, userPurchases, emptyMessage }: { 
    title: string, 
    items: (Campaign & { advertiserName?: string })[], 
    userPoints: number, 
    userPurchases: UserReward[],
    emptyMessage?: string 
}) {
    if (items.length === 0 && !emptyMessage) return null;

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
                {items.length > 1 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 animate-pulse">Desliza <ChevronRight className="w-3 h-3" /></span>}
            </div>
            
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 scrollbar-hide">
                {items.length === 0 ? (
                    <div className="w-[85vw] shrink-0 snap-start">
                        <Card className="border-dashed bg-muted/20 h-[140px] flex flex-col items-center justify-center text-center p-4">
                            <Gift className="w-8 h-8 text-muted-foreground/40 mb-2" />
                            <p className="text-xs text-muted-foreground leading-relaxed">{emptyMessage}</p>
                        </Card>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className="w-[85vw] max-w-[320px] shrink-0 snap-start">
                            <RewardCard 
                                campaign={item} 
                                userPoints={userPoints}
                                userPurchases={userPurchases}
                            />
                        </div>
                    ))
                )}
                {/* Spacer to allow breathing room at the end of scroll */}
                <div className="w-4 shrink-0" aria-hidden="true" />
            </div>
        </div>
    );
}

function DashboardTabsContent({ bikes, registrations, isProfileComplete, user, activeRewards = [], userPurchases = [] }: DashboardTabsProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const [referralData, setReferralData] = useState<ReferralData | null>(null);

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
        const shareText = `¡Qué onda! Te conseguí una invitación para Biciregistro. Mi bici ya tiene su Identidad Digital y fue ¡gratis!. Si registras tu bici con este link, a los dos nos regalan 200 Kilómetros para canjear por equipo, servicios o café en tiendas ciclistas. 🚴‍♂️⚡\n\nTardas 30 segundos, protege la tuya aquí 👉: ${referralData.shareUrl}`;
        const shareData = { title: 'Únete a BiciRegistro', text: shareText };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch (err) { navigator.clipboard.writeText(shareText); }
        } else {
            navigator.clipboard.writeText(shareText);
            toast({ title: "Mensaje copiado", description: "El mensaje de invitación ha sido copiado al portapapeles." });
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

    const pointsBalance = user.gamification?.pointsBalance || 0;
    
    // Logic to categorize rewards
    const { myPurchases, giveaways, regularRewards, combinedList } = useMemo(() => {
        const activeCampaignIds = new Set(activeRewards.map(r => r.id));
        const purchasedIds = new Set(userPurchases.map(up => up.campaignId));
        
        const legacyPurchases: (Campaign & { advertiserName?: string })[] = [];
        userPurchases.forEach(ur => {
            if (ur.status === 'purchased') {
                legacyPurchases.push({
                    id: ur.campaignId,
                    title: ur.campaignSnapshot.title,
                    advertiserId: ur.advertiserId,
                    advertiserName: ur.campaignSnapshot.advertiserName,
                    bannerImageUrl: ur.campaignSnapshot.bannerImageUrl,
                    description: ur.campaignSnapshot.description,
                    conditions: ur.campaignSnapshot.conditions,
                    endDate: ur.campaignSnapshot.endDate,
                    priceKm: ur.pricePaidKm,
                    type: ur.campaignSnapshot.type || 'reward',
                    status: 'ended', 
                    placement: 'event_list',
                    clickCount: 0,
                    uniqueConversionCount: 0,
                    createdAt: ur.purchasedAt,
                    updatedAt: ur.purchasedAt
                } as Campaign & { advertiserName?: string });
            }
        });

        const combined = [...activeRewards];
        legacyPurchases.forEach(lp => {
            if (!activeCampaignIds.has(lp.id)) {
                combined.push(lp);
            }
        });

        return {
            myPurchases: combined.filter(c => purchasedIds.has(c.id)),
            giveaways: activeRewards.filter(r => r.type === 'giveaway' && !purchasedIds.has(r.id)),
            regularRewards: activeRewards.filter(r => r.type === 'reward' && !purchasedIds.has(r.id)),
            combinedList: combined
        };
    }, [activeRewards, userPurchases]);

    return (
        <Tabs id="tour-garage" value={activeTab} onValueChange={onTabChange} className="w-full relative">
            <TabsList className="hidden md:grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="garage">Mi Garaje ({bikes.length})</TabsTrigger>
                <TabsTrigger value="events">Mis Eventos</TabsTrigger>
                <TabsTrigger value="rewards" className="relative">
                    Mis Recompensas
                    {userPurchases.filter(ur => ur.status === 'purchased').length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 text-[10px] items-center justify-center text-white">
                              {userPurchases.filter(ur => ur.status === 'purchased').length}
                          </span>
                        </span>
                    )}
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value="garage" className="space-y-4">
                {/* Desktop: Show promotional banner at top. */}
                <div className="hidden md:block mb-6">
                    <PromotionalBanner userCountry={user.country} userState={user.state} />
                </div>

                {!isProfileComplete ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-amber-200 rounded-2xl bg-amber-50 shadow-sm max-w-2xl mx-auto my-8 animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 ring-8 ring-amber-50">
                            <UserCircle className="h-10 w-10 text-amber-600" />
                        </div>
                        <h3 className="text-2xl font-black text-amber-900 tracking-tight mb-3">Perfil Incompleto</h3>
                        <p className="text-amber-800 font-medium max-w-sm mb-8 leading-relaxed">
                            Completa tu perfil para poder ver o registrar tus bicicletas en el Garaje Digital.
                        </p>
                        <Button asChild size="lg" className="w-full sm:w-auto font-bold px-10 h-14 text-lg bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200 transition-all hover:scale-105">
                            <Link href="/dashboard/profile">Completar Perfil Ahora</Link>
                        </Button>
                        <div className="mt-8 flex items-center gap-2 text-amber-700/60 font-bold text-[10px] uppercase tracking-widest">
                            <AlertTriangle className="h-3 w-3" /> Acción Requerida
                        </div>
                    </div>
                ) : bikes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-xl bg-muted/30">
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                            <PlusCircle className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight mb-2">No tienes bicicletas registradas</h3>
                        <p className="text-muted-foreground max-w-sm mb-8">
                            Crea el ADN Digital de tu bicicleta para protegerla.
                        </p>
                        <Button asChild size="lg" className="w-full sm:w-auto font-semibold">
                            <Link href="/dashboard/register">Registrar Bici Ahora</Link>
                        </Button>
                        <Button variant="link" asChild className="mt-4 text-muted-foreground min-h-[44px]">
                             <Link href="/faqs" className="flex items-center gap-2">
                                 <HelpCircle className="h-4 w-4" />
                                 <span>¿Por qué debo registrar mi bici?</span>
                             </Link>
                        </Button>
                        
                        {/* Mobile Banner: Insert here if no bikes (Requirement: Below CTA) */}
                        <div className="md:hidden mt-8 w-full">
                            <PromotionalBanner userCountry={user.country} userState={user.state} />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 pb-28 md:pb-0">
                        {/* Mobile: Promotional banner NO LONGER at the top. Requirement: Below first bike or between 1st and 2nd. */}
                        {bikes.map((bike: Bike, index: number) => (
                            <div key={bike.id}>
                                <BikeCard bike={bike} user={user} />
                                {/* Mobile Banner: Insert after first bike (Requirement) */}
                                {index === 0 && (
                                    <div className="md:hidden mt-4">
                                        <PromotionalBanner userCountry={user.country} userState={user.state} />
                                    </div>
                                )}
                            </div>
                        ))}
                        <div id="tour-main-action" className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
                             {isProfileComplete ? (
                                <Button asChild className="h-12 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-white font-bold px-6">
                                    <Link href="/dashboard/register" className="flex items-center gap-2"><PlusCircle className="h-5 w-5" /><span>Agregar Bici</span></Link>
                                </Button>
                             ) : (
                                <Button disabled className="h-12 rounded-full shadow-xl opacity-50 font-bold px-6 flex items-center gap-2"><PlusCircle className="h-5 w-5" /><span>Agregar Bici</span></Button>
                             )}
                        </div>
                    </div>
                )}
            </TabsContent>
            
            <TabsContent value="events" className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-xl font-semibold hidden sm:block">Mis Eventos</h2>
                    <Button asChild className="w-full sm:w-auto"><Link href="/events"><Compass className="mr-2 h-4 w-4" />Explorar eventos</Link></Button>
                </div>
                {!isProfileComplete ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-amber-200 rounded-xl bg-amber-50/50">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6"><Calendar className="h-8 w-8 text-amber-600" /></div>
                        <h3 className="text-xl font-bold tracking-tight mb-2 text-amber-800">Perfil Incompleto</h3>
                        <p className="text-amber-700/80 max-w-sm mb-6">Para registrarte en eventos, primero debes completar tu perfil.</p>
                        <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white"><Link href="/dashboard/profile">Completar Perfil Ahora</Link></Button>
                    </div>
                ) : registrations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-xl bg-muted/30">
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6"><Calendar className="h-10 w-10 text-primary" /></div>
                        <h3 className="text-2xl font-bold tracking-tight mb-2">No tienes eventos próximos</h3>
                        <p className="text-muted-foreground max-w-sm mb-8">Aún no te has registrado en ningún evento.</p>
                        <Button asChild size="lg" className="w-full sm:w-auto font-semibold"><Link href="/events">Ver Eventos Disponibles</Link></Button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                         {sortedRegistrations.map((reg) => {
                            const eventDate = new Date(reg.event.date);
                            const isFinished = eventDate < now;
                            let badgeText = reg.status === 'confirmed' ? 'Confirmado' : reg.status;
                            let badgeClassName = "text-xs shrink-0";
                            let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
                            if (isFinished) { badgeText = "Finalizado"; badgeClassName = cn(badgeClassName, "bg-slate-500 text-white border-transparent"); } 
                            else if (reg.status === 'confirmed') {
                                if (reg.event.costType === 'Con Costo' && reg.paymentStatus === 'paid') { badgeText = "Pagado"; badgeClassName = cn(badgeClassName, "bg-green-600 text-white border-transparent"); } 
                                else if (reg.event.costType === 'Con Costo') { badgeText = "Pago Pendiente"; badgeClassName = cn(badgeClassName, "bg-yellow-100 text-yellow-800 border-yellow-200"); } 
                                else { badgeText = "Confirmado"; badgeClassName = cn(badgeClassName, "bg-green-100 text-green-800 border-green-200"); }
                            } else { badgeVariant = "destructive"; }
                            return (
                                <Card key={reg.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                    <CardContent className="p-0">
                                        <div className="flex flex-row h-full">
                                            <div className="w-24 sm:w-32 bg-muted flex-shrink-0 relative">
                                                {reg.event.imageUrl ? <img src={reg.event.imageUrl} alt={reg.event.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Calendar className="h-8 w-8" /></div>}
                                            </div>
                                            <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start gap-2 mb-1">
                                                        <h3 className="font-bold text-sm sm:text-lg line-clamp-2 leading-tight">{reg.event.name}</h3>
                                                        <Badge variant={badgeVariant} className={cn(badgeClassName, "hidden sm:inline-flex")}>{badgeText}</Badge>
                                                    </div>
                                                    <Badge variant={badgeVariant} className={cn(badgeClassName, "sm:hidden mb-2 self-start")}>{badgeText}</Badge>
                                                    <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                                                        <div className="flex items-center gap-1"><Calendar className="h-3 w-3 flex-shrink-0" /><span className="truncate">{eventDate.toLocaleDateString()}</span></div>
                                                        <div className="flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0" /><span className="truncate">{reg.event.state}, {reg.event.country}</span></div>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex justify-between items-center">
                                                    <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full"><FileText className="w-3 h-3 mr-1" /><span className="hidden sm:inline">Liberación Firmada</span><span className="sm:hidden">Firmado</span></div>
                                                    <Button variant="ghost" size="sm" asChild className="text-primary p-0 h-auto"><Link href={`/dashboard/events/${reg.eventId}`} className="flex items-center gap-1">Detalles <ArrowRight className="h-3 w-3" /></Link></Button>
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

            <TabsContent value="rewards" className="space-y-4 pb-28 md:pb-0">
                <div className="hidden md:block bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2 text-white"><Gift className="w-6 h-6" /> Mis Recompensas</h2>
                            <p className="text-emerald-50/90 text-sm max-w-xl">Canjea tus Kilómetros (KM) acumulados por beneficios exclusivos de aliados.</p>
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
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-emerald-300 opacity-10 rounded-full blur-2xl"></div>
                </div>

                {isProfileComplete && <div className="mb-6"><ReferralStatsCard user={user} /></div>}

                {/* DESKTOP VIEW: Unified Grid */}
                <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {combinedList.length === 0 ? (
                        <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl bg-muted/30">
                             <p className="text-muted-foreground">Próximamente más beneficios.</p>
                        </div>
                    ) : (
                        combinedList.map((campaign) => (
                            <RewardCard key={campaign.id} campaign={campaign} userPoints={pointsBalance} userPurchases={userPurchases} />
                        ))
                    )}
                </div>

                {/* MOBILE VIEW: Horizontal Lanes */}
                <div className="md:hidden flex flex-col space-y-8">
                    {combinedList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-xl bg-muted/30">
                            <Gift className="h-10 w-10 text-primary mb-4" />
                            <h3 className="text-xl font-bold mb-2">Próximamente más beneficios</h3>
                            <p className="text-muted-foreground text-sm">Sigue acumulando KM para canjearlos en el futuro.</p>
                        </div>
                    ) : (
                        <>
                            <MobileRewardLane 
                                title="Mis Beneficios Adquiridos" 
                                items={myPurchases} 
                                userPoints={pointsBalance} 
                                userPurchases={userPurchases}
                                emptyMessage="Aún no tienes beneficios, adquiere uno deslizando abajo."
                            />
                            
                            <MobileRewardLane 
                                title="Sorteos (Giveaways)" 
                                items={giveaways} 
                                userPoints={pointsBalance} 
                                userPurchases={userPurchases}
                            />

                            <MobileRewardLane 
                                title="Recompensas" 
                                items={regularRewards} 
                                userPoints={pointsBalance} 
                                userPurchases={userPurchases}
                            />
                        </>
                    )}
                    
                    <GamificationRulesSheet>
                        <button className="text-muted-foreground w-full flex items-center justify-center gap-1 text-xs hover:text-primary transition-colors py-2">
                            <Info className="h-3 w-3" />
                            <span>¿Cómo acumulo más KM?</span>
                        </button>
                    </GamificationRulesSheet>
                </div>

                {isProfileComplete && (
                    <div id="tour-main-action" className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
                        <Button onClick={handleShare} className="h-12 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-white font-bold px-6 flex items-center gap-2">
                            <Coins className="h-5 w-5" /><span>Ganar {referralData?.referralPoints || 200} KM</span>
                        </Button>
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}

export function DashboardTabs(props: DashboardTabsProps) {
    return (<Suspense fallback={<div>Cargando...</div>}><DashboardTabsContent {...props} /></Suspense>);
}
