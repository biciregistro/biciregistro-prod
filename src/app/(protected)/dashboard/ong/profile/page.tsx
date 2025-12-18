import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAuthenticatedUser, getOngProfile } from '@/lib/data';
import { OngProfileForm } from '@/components/ong/ong-profile-form';
import type { OngUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// Loading skeleton for the form
const FormSkeleton = () => (
    <div className="space-y-6">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-8 w-3/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
            <div className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
        <div className="flex justify-end">
            <Skeleton className="h-10 w-24" />
        </div>
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
        };
    } else {
        // This is the critical fix for new/broken users:
        // Instead of showing an error, we show the form pre-filled with basics
        // so the user can "repair" their profile by saving it.
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
                <div className="mb-8">
                    <Link href="/dashboard/ong">
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Regresar al Panel
                        </Button>
                    </Link>
                </div>
                <Suspense fallback={<FormSkeleton />}>
                    <OngProfileForm ongProfile={fullOngProfile} />
                </Suspense>
            </div>
        </div>
    );
}
