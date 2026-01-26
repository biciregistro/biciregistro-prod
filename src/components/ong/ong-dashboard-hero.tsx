'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Settings, ExternalLink, Share2, MapPin } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { OngUser } from '@/lib/types';

interface OngDashboardHeroProps {
    ongProfile: OngUser;
}

function ShareButton({ url }: { url: string }) {
    const { toast } = useToast();

    const handleShare = async () => {
        const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Únete a mi comunidad en Biciregistro',
                    text: 'Regístrate y participa en mis eventos.',
                    url: fullUrl,
                });
            } catch (error) {
                console.log('Share cancelled');
            }
        } else {
             navigator.clipboard.writeText(fullUrl).then(() => {
                toast({ title: "¡Copiado!", description: "El enlace al perfil ha sido copiado al portapapeles." });
            });
        }
    };

    return (
        <Button variant="secondary" size="sm" onClick={handleShare} className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border-white/20">
            <Share2 className="mr-2 h-4 w-4" />
            Compartir Link
        </Button>
    );
}

export function OngDashboardHero({ ongProfile }: OngDashboardHeroProps) {
    const profileUrl = ongProfile.invitationLink || `/join/${ongProfile.id}`;
    
    // Fallback initials
    const initials = ongProfile.organizationName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <div className="relative w-full rounded-xl overflow-hidden shadow-sm mb-8 bg-slate-900 group">
            {/* Background Image Layer */}
            <div className="absolute inset-0 z-0">
                {ongProfile.coverUrl ? (
                    <img 
                        src={ongProfile.coverUrl} 
                        alt="Portada" 
                        className="w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-slate-900 to-slate-800" />
                )}
                {/* Gradient Overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-end gap-6 min-h-[280px]">
                
                {/* Logo Section */}
                <div className="flex-shrink-0">
                    <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-white/10 shadow-xl rounded-2xl">
                        <AvatarImage src={ongProfile.logoUrl} alt={ongProfile.organizationName} className="object-cover" />
                        <AvatarFallback className="text-2xl font-bold bg-slate-800 text-white rounded-2xl">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </div>

                {/* Text Info Section */}
                <div className="flex-grow space-y-2 mb-2">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-md">
                        {ongProfile.organizationName}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-4 text-slate-300 text-sm sm:text-base">
                        {ongProfile.state && ongProfile.country && (
                            <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4 text-white/70" />
                                <span>{ongProfile.state}, {ongProfile.country}</span>
                            </div>
                        )}
                        <span className="hidden sm:inline-block text-slate-500">•</span>
                        <span className="text-white/80">Panel de Organización</span>
                    </div>
                </div>

                {/* Actions Section */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <Button variant="outline" size="sm" asChild className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:text-white backdrop-blur-sm">
                        <Link href="/dashboard/ong/profile">
                            <Settings className="mr-2 h-4 w-4" />
                            Editar Perfil
                        </Link>
                    </Button>
                    
                    <Button variant="outline" size="sm" asChild className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:text-white backdrop-blur-sm">
                        <Link href={`/join/${ongProfile.id}`} target="_blank">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ver Público
                        </Link>
                    </Button>

                    <ShareButton url={profileUrl} />
                </div>
            </div>
        </div>
    );
}
