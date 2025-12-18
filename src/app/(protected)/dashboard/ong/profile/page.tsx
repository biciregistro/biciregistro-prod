import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAuthenticatedUser, getOngProfile } from '@/lib/data';
import { OngSettingsTabs } from '@/components/ong/ong-settings-tabs';
import type { OngUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// Loading skeleton for the tabs
const TabsSkeleton = () => (
    <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
    </div>
);


export default async function OngProfilePage() {
    const user = await getAuthenticatedUser();

    if (!user || user.role !== 'ong') {
        redirect('/dashboard');
    }

    const ongProfileData = await getOngProfile(user.id);
    
    // Construct safe default profile object
    // Handles BOTH creation (new ONG) and editing (existing ONG)
    // If profile is missing, we pre-fill with whatever user data we have
    let fullOngProfile: OngUser;

    if (ongProfileData) {
        fullOngProfile = {
            ...ongProfileData,
            email: user.email,
            role: 'ong',
            organizationName: ongProfileData.organizationName || user.name || '',
            logoUrl: ongProfileData.logoUrl || user.avatarUrl || '',
            
            contactPerson: ongProfileData.contactPerson || '',
            organizationWhatsapp: ongProfileData.organizationWhatsapp || user.whatsapp || '',
            contactWhatsapp: ongProfileData.contactWhatsapp || '',
            websiteUrl: ongProfileData.websiteUrl || '',
            instagramUrl: ongProfileData.instagramUrl || '',
            facebookUrl: ongProfileData.facebookUrl || '',
            country: ongProfileData.country || user.country || '',
            state: ongProfileData.state || user.state || '',
            description: ongProfileData.description || '',
            invitationLink: ongProfileData.invitationLink || '',
            // Ensure financialData exists or is undefined (not null)
            financialData: ongProfileData.financialData,
        };
    } else {
        // Fallback for new users
        fullOngProfile = {
            id: user.id,
            role: 'ong',
            email: user.email,
            organizationName: user.name || '',
            contactPerson: '',
            organizationWhatsapp: user.whatsapp || '',
            contactWhatsapp: '',
            websiteUrl: '',
            instagramUrl: '',
            facebookUrl: '',
            country: user.country || '',
            state: user.state || '',
            logoUrl: user.avatarUrl || '',
            description: '',
            invitationLink: '',
        };
    }

    return (
        <div className="container py-8 px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                        <p className="text-muted-foreground">Gestiona tu perfil público y tu información financiera.</p>
                    </div>
                    <Link href="/dashboard/ong">
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver al Tablero
                        </Button>
                    </Link>
                </div>
                
                <Suspense fallback={<TabsSkeleton />}>
                    <OngSettingsTabs ongProfile={fullOngProfile} />
                </Suspense>
            </div>
        </div>
    );
}
