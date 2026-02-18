'use client';

import { useState, useEffect } from 'react';
import { CampaignList } from './campaign-list';
import { CampaignCreator } from './campaign-creator'; 
import { CampaignDetail } from './campaign-detail';
import { Campaign } from '@/lib/types';
import { getAllCampaignsForAdmin } from '@/lib/actions/campaign-actions';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CampaignManagerProps {
    advertisers: {id: string, name: string}[];
}

export function CampaignManager({ advertisers }: CampaignManagerProps) {
    const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    const loadCampaigns = async () => {
        setLoading(true);
        try {
            const data = await getAllCampaignsForAdmin();
            setCampaigns(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCampaigns();
    }, []);

    const handleCreateSuccess = () => {
        setView('list');
        loadCampaigns();
    };

    const handleManage = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setView('detail');
    };

    if (loading && campaigns.length === 0) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
    }

    if (view === 'create') {
        return (
            <div className="space-y-4">
                <Button variant="ghost" onClick={() => setView('list')} className="mb-4">← Volver al listado</Button>
                <CampaignCreator advertisers={advertisers} onSuccess={handleCreateSuccess} />
            </div>
        );
    }

    if (view === 'detail' && selectedCampaign) {
        return (
            <CampaignDetail 
                campaign={selectedCampaign} 
                onBack={() => {
                    setSelectedCampaign(null);
                    setView('list');
                }} 
            />
        );
    }

    return (
        <CampaignList 
            campaigns={campaigns} 
            onCreateNew={() => setView('create')} 
            onManage={handleManage} 
        />
    );
}
