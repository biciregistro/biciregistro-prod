'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Gift, Handshake, Users, Calendar, MapPin, ChevronRight } from 'lucide-react';
import { SocialAuthButtons } from '@/components/auth/social-auth';
import { ProfileForm } from '@/components/user-components';
import { Logo } from '@/components/icons/logo';
import type { OngUser, Event } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MobileVipClientProps {
    ong: Omit<OngUser, 'email' | 'role'>;
    communityCount: number;
    events: Event[];
}

export function MobileVipClient({ ong, communityCount, events }: MobileVipClientProps) {
    const [showEmailForm, setShowEmailForm] = useState(false);

    // Filter and sort events (reusing logic from ProfileEvents)
    const upcomingEvents = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        return events
            .filter(e => {
                const eventDate = new Date(e.date);
                return e.status === 'published' && eventDate >= now;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [events]);

    return (
        <div className="md:hidden flex flex-col relative pb-12 bg-gray-50 min-h-screen">
            
            <style dangerouslySetInnerHTML={{__html: `
                @media (max-width: 768px) {
                    header.sticky { display: none !important; }
                    body { background-color: #f9fafb; }
                }
            `}} />

            {/* HEADER MINIMALISTA */}
            <div className="bg-white pt-8 pb-4 flex justify-center items-center shadow-sm relative z-40 border-b border-gray-100">
                <div className="scale-75 origin-center">
                    <Logo />
                </div>
            </div>

            {/* HERO CO-BRANDING */}
            <div className="relative pt-8 pb-16 px-6 text-center shadow-md rounded-b-[40px] overflow-hidden">
                <div className="absolute inset-0 z-0 bg-black">
                    {ong.coverUrl && (
                        <Image 
                            src={ong.coverUrl} 
                            alt={`Portada de ${ong.organizationName}`} 
                            fill 
                            className="object-cover opacity-60"
                            priority
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/70 to-black" />
                </div>

                <div className="relative z-10">
                    <span className="text-white text-[10px] font-bold uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/20 shadow-sm">
                        Comunidad Oficial
                    </span>
                    
                    <div className="flex justify-center items-center mt-6 space-x-3">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-white overflow-hidden relative">
                             <Image src="/icon.png" alt="BiciRegistro" fill className="object-contain p-2" />
                        </div>
                        <div className="text-white">
                            <Handshake className="w-5 h-5 opacity-80" />
                        </div>
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-white overflow-hidden relative">
                            {ong.logoUrl ? (
                                <Image src={ong.logoUrl} alt={ong.organizationName} fill className="object-cover" />
                            ) : (
                                <Users className="text-gray-400 w-5 h-5" />
                            )}
                        </div>
                    </div>
                    
                    <h2 className="text-white font-bold text-xl mt-4 drop-shadow-lg">{ong.organizationName}</h2>
                </div>
            </div>

            {/* SECCIÓN DE EVENTOS (SCROLL HORIZONTAL) */}
            {upcomingEvents.length > 0 && (
                <section className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="px-6 flex justify-between items-end mb-4">
                        <h3 className="text-gray-900 font-extrabold text-lg">Próximos Eventos</h3>
                        <span className="text-xs text-primary font-medium">Desliza →</span>
                    </div>
                    
                    <div className="flex overflow-x-auto pb-4 gap-4 px-6 no-scrollbar snap-x snap-mandatory">
                        {upcomingEvents.map((event) => (
                            <div 
                                key={event.id} 
                                className="min-w-[280px] bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 snap-start flex flex-col"
                            >
                                <Link href={`/events/${event.id}`} className="h-32 relative block">
                                    {event.imageUrl ? (
                                        <Image src={event.imageUrl} alt={event.name} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                            <Calendar className="w-8 h-8 text-primary/20" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                        <Badge variant="secondary" className="text-[9px] bg-white/90 backdrop-blur-sm">
                                            {event.eventType}
                                        </Badge>
                                    </div>
                                </Link>
                                <div className="p-4 flex-1 flex flex-col">
                                    <h4 className="font-bold text-gray-900 text-sm line-clamp-1 mb-2">{event.name}</h4>
                                    <div className="space-y-1 mt-auto">
                                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                            <Calendar className="w-3 h-3" />
                                            <span>{format(new Date(event.date), "d 'de' MMMM", { locale: es })}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                            <MapPin className="w-3 h-3" />
                                            <span className="line-clamp-1">{event.state}</span>
                                        </div>
                                    </div>
                                    
                                    <Link href={`/events/${event.id}`} className="block mt-3">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="w-full h-8 text-[11px] text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                        >
                                            Ver Detalles
                                            <ChevronRight className="w-3 h-3 ml-1" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                        {/* Tarjeta de "Ver más" sutil al final */}
                        <div className="min-w-[120px] flex items-center justify-center snap-start">
                             <Link href="/events" className="text-center">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </div>
                                <span className="text-[10px] text-gray-500 font-medium">Ver todos</span>
                             </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* TARJETA DE RECOMPENSA (Hook VIP) */}
            <section className="px-5 mt-6 relative z-20">
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 flex flex-col items-center text-center">
                    <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-3 shadow-inner">
                        <Gift className="w-7 h-7 text-orange-500" />
                    </div>
                    <h3 className="font-extrabold text-gray-900 text-lg mb-2">¡Invitación VIP Desbloqueada!</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-1">
                        <strong>{ong.organizationName}</strong> te invita a unirte a su comunidad. 
                    </p>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Protege tu bici hoy y llévate <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-100">1,000 B-Coins</span> de bienvenida.
                    </p>
                </div>
            </section>

            {/* TARJETA DE REGISTRO */}
            <section className="px-5 mt-8">
                <div className="bg-white rounded-[30px] p-7 shadow-2xl border border-gray-100 text-center relative overflow-hidden">
                    
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

                    {!showEmailForm ? (
                        <div className="animate-in fade-in duration-300">
                            <h2 className="font-bold text-gray-900 text-xl mb-4 leading-tight">
                                Reclama tus 1,000 B-Coins ahora
                            </h2>
                            
                            <p className="text-xs text-muted-foreground mb-6 leading-relaxed px-4">
                                Tu cuenta con <strong>{ong.organizationName}</strong> está lista. Entra para obtener tus 1,000 B-Coins y registrar tu bici.
                            </p>

                            <div className="w-full mb-6">
                                <SocialAuthButtons 
                                    callbackUrl={`/dashboard/ong-onboarding?communityId=${ong.id}`} 
                                    mode="signup" 
                                />
                            </div>

                            <div className="mb-2">
                                <Button 
                                    variant="link" 
                                    className="text-xs text-gray-500 hover:text-gray-800 h-auto p-0"
                                    onClick={() => setShowEmailForm(true)}
                                >
                                    No tengo cuenta de Google
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-top-4 fade-in duration-500 text-left mb-6">
                            <h2 className="font-bold text-gray-900 text-xl mb-6 leading-tight text-center">
                                Crea tu cuenta con Correo
                            </h2>
                            
                            <ProfileForm 
                                communityId={ong.id} 
                                callbackUrl={`/dashboard/ong-onboarding?communityId=${ong.id}`} 
                                hideSocial={true}
                            />

                            <div className="text-center mt-6">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-xs text-gray-400 hover:text-gray-600"
                                    onClick={() => setShowEmailForm(false)}
                                >
                                    ← Volver a registro rápido con Google
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="inline-flex items-center space-x-2 bg-blue-50 py-2 px-4 rounded-xl border border-blue-100 mt-4">
                        <div className="flex -space-x-2">
                            <div className="w-6 h-6 rounded-full border-2 border-white bg-blue-400 flex items-center justify-center text-[10px] text-white font-bold">C</div>
                            <div className="w-6 h-6 rounded-full border-2 border-white bg-orange-400 flex items-center justify-center text-[10px] text-white font-bold">M</div>
                            <div className="w-6 h-6 rounded-full border-2 border-white bg-blue-200 flex justify-center items-center text-[10px] text-blue-700 font-bold">+</div>
                        </div>
                        <span className="text-[11px] font-bold text-blue-800">
                            {communityCount > 0 ? `${communityCount} ciclistas ya se unieron aquí` : 'Sé el primero en unirte aquí'}
                        </span>
                    </div>

                </div>
            </section>
        </div>
    );
}
