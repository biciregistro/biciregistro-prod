import { redirect } from 'next/navigation';
import { getOngProfile, getEventsByOngId, getOngCommunityCount, getAuthenticatedUser } from '@/lib/data';
import { ProfileForm } from '@/components/user-components';
import { ProfileHero } from '@/components/ong-public-profile/profile-hero';
import { ProfileInfo } from '@/components/ong-public-profile/profile-info';
import { ProfileEvents } from '@/components/ong-public-profile/profile-events';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Building } from 'lucide-react';
import { MobileVipClient } from './mobile-vip-client';
import type { User } from '@/lib/types';
import type { Metadata } from 'next';

type JoinPageProps = {
    params: Promise<{
        ongId: string;
    }>;
};

// --- Open Graph Metadata Generation ---
export async function generateMetadata({ params }: JoinPageProps): Promise<Metadata> {
    const { ongId } = await params;
    const ong = await getOngProfile(ongId);

    if (!ong) {
        return {
            title: 'Organización no encontrada | BiciRegistro',
        };
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
    
    // Prioritize Cover Image -> Logo -> Default
    let imageUrl = ong.coverUrl || ong.logoUrl || '/rodada-segura.png'; 
    if (imageUrl.startsWith('/')) {
        imageUrl = `${baseUrl}${imageUrl}`;
    }

    const title = `Únete a ${ong.organizationName} | BiciRegistro`;
    const description = ong.description 
        ? (ong.description.length > 160 ? ong.description.substring(0, 157) + '...' : ong.description)
        : `Forma parte de la comunidad de ${ong.organizationName} en BiciRegistro. Accede a eventos exclusivos y protege tu bicicleta.`;

    return {
        title: title,
        description: description,
        openGraph: {
            title: title,
            description: description,
            url: `${baseUrl}/join/${ong.id}`,
            siteName: 'BiciRegistro',
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: `Comunidad de ${ong.organizationName}`,
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

export default async function JoinPage({ params }: JoinPageProps) {
    const { ongId } = await params;
    
    // Fetch all required data in parallel
    const [ong, events, communityCount, user] = await Promise.all([
        getOngProfile(ongId),
        getEventsByOngId(ongId),
        getOngCommunityCount(ongId),
        getAuthenticatedUser()
    ]);

    if (!ong) {
        redirect('/signup?error=invalid_community');
    }

    // --- CLASSIC REGISTRATION SECTION FOR DESKTOP (UNAUTHENTICATED) ---
    const ClassicRegistrationSection = ({ ongId, ongName }: { ongId: string, ongName: string }) => {
        return (
            <div className="space-y-4">
                <Alert className="bg-primary/5 border-primary/20">
                    <Building className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary font-bold">¡Únete a nuestra comunidad!</AlertTitle>
                    <AlertDescription className="text-sm">
                        Al registrarte desde esta página, quedarás vinculado directamente con <strong>{ongName}</strong>.
                    </AlertDescription>
                </Alert>
                
                <div className="rounded-xl overflow-hidden border bg-card shadow-sm">
                    <ProfileForm communityId={ongId} callbackUrl="/dashboard/ong-onboarding" />
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background">
            
            {/* Si NO hay usuario autenticado, cargamos el diseño VIP para Móvil */}
            {!user && (
                <MobileVipClient ong={ong} communityCount={communityCount} />
            )}

            {/* CONTENEDOR CLÁSICO: 
                - Si no hay usuario: Oculto en móvil (porque ya está el VIP), Visible en Desktop.
                - Si hay usuario: Visible en ambos (móvil y desktop).
            */}
            <div className={`pb-20 ${!user ? 'hidden md:block' : 'block'}`}>
                
                {/* Desktop Hero siempre se muestra si la clase padre lo permite */}
                <ProfileHero ong={ong} communityCount={communityCount} />

                <div className="container px-4 mx-auto mt-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Left Column: Form and Events */}
                        <div className="lg:col-span-2 space-y-10">
                            
                            {/* Formulario clásico de Desktop (Solo si no hay usuario) */}
                            {!user && (
                                <ClassicRegistrationSection ongId={ongId} ongName={ong.organizationName} />
                            )}
                            
                            {/* Info Card for MOBILE - Visible solo si el usuario ya está autenticado */}
                            {user && (
                                <div className="lg:hidden">
                                    <ProfileInfo ong={ong} />
                                </div>
                            )}

                            {/* Events Grid */}
                            <ProfileEvents events={events} />
                        </div>

                        {/* Right Column: Info for DESKTOP */}
                        <div className="hidden lg:block lg:col-span-1">
                            <div className="sticky top-24">
                                <ProfileInfo ong={ong} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
