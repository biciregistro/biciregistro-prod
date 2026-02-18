import { getAuthenticatedUser } from '@/lib/data';
import { getAdvertiserCampaigns } from '@/lib/actions/campaign-actions';
import { redirect } from 'next/navigation';
import { CampaignsList } from '@/components/ong/campaigns-list';

export default async function OngCampaignsPage() {
    const user = await getAuthenticatedUser();

    if (!user || user.role !== 'ong') {
        redirect('/dashboard');
    }

    const campaigns = await getAdvertiserCampaigns(user.id);

    return (
        <div className="container py-8 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Mis Campañas</h1>
            <p className="text-muted-foreground mb-8">
                Visualiza el rendimiento de tus anuncios y descarga la base de datos de interesados.
            </p>
            
            <CampaignsList campaigns={campaigns} advertiserId={user.id} />
        </div>
    );
}
