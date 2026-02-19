'use client';

import { useState } from 'react';
import { CampaignList } from '@/components/admin/campaigns/campaign-list'; 
import { CampaignDetail } from '@/components/admin/campaigns/campaign-detail';
import { Campaign } from '@/lib/types';

interface OngCampaignManagerProps {
    campaigns: Campaign[];
    user: { id: string; name: string; organizationName?: string };
}

export function OngCampaignManager({ campaigns, user }: OngCampaignManagerProps) {
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

    // Create a minimal advertisers list for the detail view context
    const advertisers = [{
        id: user.id,
        name: user.organizationName || user.name
    }];

    const handleManage = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setView('detail');
    };

    if (view === 'detail' && selectedCampaign) {
        return (
            <CampaignDetail 
                campaign={selectedCampaign} 
                advertisers={advertisers}
                onBack={() => {
                    setSelectedCampaign(null);
                    setView('list');
                }} 
                onUpdate={() => {}} // No-op for read-only
                readOnly={true}
            />
        );
    }

    return (
        <CampaignList 
            campaigns={campaigns} 
            advertisers={advertisers}
            onManage={handleManage} 
            // onCreateNew is deliberately omitted to trigger the "No campaigns? Contact us" state
        />
    );
}
