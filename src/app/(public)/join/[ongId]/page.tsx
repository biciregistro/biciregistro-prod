import { redirect } from 'next/navigation';
import { getOngProfile } from '@/lib/data';
import { ProfileForm } from '@/components/user-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Building } from 'lucide-react';

type JoinPageProps = {
    params: Promise<{
        ongId: string;
    }>;
};

export default async function JoinPage({ params }: JoinPageProps) {
    const { ongId } = await params;
    const ong = await getOngProfile(ongId);

    if (!ong) {
        // Redirect to the standard signup page if the ONG ID is invalid
        redirect('/signup?error=invalid_community');
    }

    return (
        <div className="container py-8 px-4 md:px-6">
            <div className="max-w-2xl mx-auto space-y-8">
                <Alert>
                    <Building className="h-4 w-4" />
                    <AlertTitle>¡Te estás uniendo a una comunidad!</AlertTitle>
                    <AlertDescription>
                        Estás a punto de registrarte en Biciregistro como parte de la comunidad de <strong>{ong.organizationName}</strong>.
                    </AlertDescription>
                </Alert>

                <ProfileForm communityId={ongId} />
            </div>
        </div>
    );
}
