import { CampaignCreator } from '@/components/admin/campaigns/campaign-creator';
import { getAdvertisersList } from '@/lib/actions/campaign-actions';

export default async function AdminCampaignsPage() {
    const advertisers = await getAdvertisersList();

    return (
        <div className="container py-10">
            <h1 className="text-3xl font-bold mb-6">Gestión de Campañas</h1>
            <p className="text-muted-foreground mb-8">
                Crea y administra campañas publicitarias y activos digitales descargables.
            </p>
            <CampaignCreator advertisers={advertisers} />
        </div>
    );
}
