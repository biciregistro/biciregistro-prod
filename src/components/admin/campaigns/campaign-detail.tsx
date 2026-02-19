'use client';

import { Campaign } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, PlayCircle, PauseCircle, Loader2, User } from 'lucide-react';
import { CampaignsList } from '@/components/ong/campaigns-list'; 
import { updateCampaignStatus, getCampaignAnalyticsAction } from '@/lib/actions/campaign-actions';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { EventAnalyticsView } from '@/components/ong/event-analytics-view';
import { EventAnalyticsData } from '@/lib/data/event-analytics';

interface CampaignDetailProps {
    campaign: Campaign;
    advertisers: {id: string, name: string}[];
    onBack: () => void;
    onUpdate: () => void; 
    readOnly?: boolean;
}

function AnalyticsLoader({ campaignId, pageViews }: { campaignId: string, pageViews: number }) {
    const [data, setData] = useState<EventAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getCampaignAnalyticsAction(campaignId).then(setData).finally(() => setLoading(false));
    }, [campaignId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Analizando datos de la campaña...</p>
            </div>
        );
    }
    
    if (!data) {
        return <div className="p-8 text-center text-muted-foreground">No se pudieron cargar los datos.</div>;
    }

    return <EventAnalyticsView data={data} pageViews={pageViews} />;
}

export function CampaignDetail({ campaign, advertisers, onBack, onUpdate, readOnly }: CampaignDetailProps) {
    const { toast } = useToast();
    const [statusLoading, setStatusLoading] = useState(false);

    const handleStatusChange = async (newStatus: 'active' | 'paused' | 'draft') => {
        setStatusLoading(true);
        try {
            const result = await updateCampaignStatus(campaign.id, newStatus);
            if (result?.success) {
                toast({ title: "Estado Actualizado", description: result.message });
                onUpdate(); 
            } else {
                toast({ title: "Error", description: result?.error, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Falló la actualización", variant: "destructive" });
        } finally {
            setStatusLoading(false);
        }
    };

    const advertiserName = advertisers.find(a => a.id === campaign.advertiserId)?.name || 'ONG Desconocida';

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {campaign.title}
                            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                                {campaign.status === 'active' ? 'Activa' : campaign.status}
                            </Badge>
                        </h2>
                        <div className="flex flex-col text-sm text-muted-foreground">
                            <span>{campaign.internalName}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <User className="h-3 w-3" />
                                <span className="font-medium">{advertiserName}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {!readOnly && (
                    <div className="flex gap-2">
                        {campaign.status !== 'active' && (
                            <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700 text-white" 
                                onClick={() => handleStatusChange('active')}
                                disabled={statusLoading}
                            >
                                {statusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                                Activar Campaña
                            </Button>
                        )}
                        {campaign.status === 'active' && (
                            <Button 
                                size="sm" 
                                variant="secondary" 
                                onClick={() => handleStatusChange('paused')}
                                disabled={statusLoading}
                            >
                                {statusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PauseCircle className="mr-2 h-4 w-4" />}
                                Pausar
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <Tabs defaultValue="stats">
                <TabsList>
                    <TabsTrigger value="stats">Indicadores</TabsTrigger>
                    <TabsTrigger value="leads">Base de Datos (Leads)</TabsTrigger>
                </TabsList>
                
                <TabsContent value="stats" className="mt-6">
                    <div className="border rounded-lg p-6 bg-card min-h-[400px]">
                        <AnalyticsLoader campaignId={campaign.id} pageViews={campaign.clickCount || 0} />
                    </div>
                </TabsContent>

                <TabsContent value="leads" className="mt-6">
                    <div className="border rounded-lg p-6 bg-card">
                        <h3 className="font-medium mb-4">Descarga de Registros</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Descarga el archivo CSV con la información de los usuarios que han interactuado con esta campaña.
                        </p>
                        <CampaignsList campaigns={[campaign]} advertiserId={campaign.advertiserId} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
