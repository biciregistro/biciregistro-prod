'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Gift, Lock, Handshake, Users } from 'lucide-react';
import { SocialAuthButtons } from '@/components/auth/social-auth';
import { ProfileForm } from '@/components/user-components';
import { Logo } from '@/components/icons/logo';
import type { OngUser } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface MobileVipClientProps {
    ong: Omit<OngUser, 'email' | 'role'>;
    communityCount: number;
}

export function MobileVipClient({ ong, communityCount }: MobileVipClientProps) {
    const [showEmailForm, setShowEmailForm] = useState(false);

    return (
        <div className="md:hidden flex flex-col relative pb-8 bg-gray-50 min-h-screen">
            
            {/* Ocultar el Header global principal con CSS en móvil */}
            <style dangerouslySetInnerHTML={{__html: `
                @media (max-width: 768px) {
                    header.sticky { display: none !important; }
                    body { background-color: #f9fafb; }
                }
            `}} />

            {/* HEADER MINIMALISTA - Con el logo oficial */}
            <div className="bg-white pt-8 pb-4 flex justify-center items-center shadow-sm relative z-40 border-b border-gray-100">
                <div className="scale-75 origin-center">
                    <Logo />
                </div>
            </div>

            {/* HERO CO-BRANDING (Fondo de imagen + Degradado NEGRO y bordes redondeados) */}
            <div className="relative pt-8 pb-20 px-6 text-center shadow-md rounded-b-[40px] overflow-hidden">
                 {/* Imagen de fondo (Cover de la ONG) */}
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
                    {/* Degradado oscuro negro para asegurar contraste de texto - CONSISTENCIA CON EL SITIO */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/70 to-black" />
                </div>

                <div className="relative z-10">
                    <span className="text-white text-xs font-bold uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/20 shadow-sm">
                        Comunidad Oficial
                    </span>
                    
                    <div className="flex justify-center items-center mt-6 space-x-3">
                        {/* Logo BiciRegistro (El icono de la pestaña) */}
                        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-white overflow-hidden relative">
                             <Image src="/icon.png" alt="BiciRegistro" fill className="object-contain p-2" />
                        </div>
                        
                        <div className="text-white">
                            <Handshake className="w-6 h-6" />
                        </div>
                        
                        {/* Logo Aliado */}
                        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-white overflow-hidden relative">
                            {ong.logoUrl ? (
                                <Image src={ong.logoUrl} alt={ong.organizationName} fill className="object-cover" />
                            ) : (
                                <Users className="text-gray-400 w-6 h-6" />
                            )}
                        </div>
                    </div>
                    
                    <h2 className="text-white font-bold text-2xl mt-4 drop-shadow-lg">{ong.organizationName}</h2>
                </div>
            </div>

            {/* TARJETA DE RECOMPENSA (Hook VIP) */}
            <section className="px-5 -mt-12 relative z-20">
                <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 flex flex-col items-center text-center">
                    <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-3 shadow-inner">
                        <Gift className="w-7 h-7 text-orange-500" />
                    </div>
                    <h3 className="font-extrabold text-gray-900 text-lg mb-2">¡Invitación VIP Desbloqueada!</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-1">
                        <strong>{ong.organizationName}</strong> te invita a unirte a su comunidad. 
                    </p>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Protege tu bici hoy y llévate <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-100">1,000 Kilómetros</span> de bienvenida.
                    </p>
                </div>
            </section>

            {/* TARJETA DE REGISTRO */}
            <section className="px-5 mt-8">
                <div className="bg-white rounded-[30px] p-7 shadow-2xl border border-gray-100 text-center relative overflow-hidden">
                    
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

                    {/* BLOQUE GOOGLE: Solo se muestra si NO se ha activado el formulario de email */}
                    {!showEmailForm ? (
                        <div className="animate-in fade-in duration-300">
                            <h2 className="font-bold text-gray-900 text-xl mb-6 leading-tight">
                                Activa tu Pasaporte Digital con <br/>
                                <span className="text-blue-600">{ong.organizationName}</span>
                            </h2>
                            
                            <div className="flex items-center justify-center text-xs font-semibold text-gray-400 mb-6">
                                <Lock className="w-3 h-3 mr-1.5" /> Toma solo 10 segundos.
                            </div>

                            {/* Botón de Google Principal */}
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
                        /* BLOQUE EMAIL: Se muestra cuando se hace clic en "No tengo cuenta de Google" */
                        <div className="animate-in slide-in-from-top-4 fade-in duration-500 text-left mb-6">
                            <h2 className="font-bold text-gray-900 text-xl mb-6 leading-tight text-center">
                                Crea tu cuenta con Correo
                            </h2>
                            
                             {/* Usamos el componente ProfileForm con HIDE SOCIAL para no duplicar botones de google */}
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

                    {/* Prueba Social - Con contador dinámico */}
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
