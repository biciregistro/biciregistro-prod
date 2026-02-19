'use client';

import { Campaign } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, PlayCircle, PauseCircle, Loader2, User } from 'lucide-react';
import { CampaignsList } from '@/components/ong/campaigns-list'; 
import { updateCampaignStatus } from '@/lib/actions/campaign-actions';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface CampaignDetailProps {
    campaign: Campaign;
    advertisers: {id: string, name: string}[];
    onBack: () => void;
    onUpdate: () => void; 
}

export function CampaignDetail({ campaign, advertisers, onBack, onUpdate }: CampaignDetailProps) {
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
            </div>

            <Tabs defaultValue="leads">
                <TabsList>
                    <TabsTrigger value="leads">Base de Datos (Leads)</TabsTrigger>
                    <TabsTrigger value="stats">Estadísticas</TabsTrigger>
                </TabsList>
                
                <TabsContent value="leads" className="mt-6">
                    <div className="border rounded-lg p-6 bg-card">
                        <h3 className="font-medium mb-4">Descarga de Registros</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Descarga el archivo CSV con la información de los usuarios que han interactuado con esta campaña.
                        </p>
                        <CampaignsList campaigns={[campaign]} advertiserId={campaign.advertiserId} />
                    </div>
                </TabsContent>

                <TabsContent value="stats" className="mt-6">
                    <div className="p-12 text-center border rounded-lg border-dashed">
                        <p className="text-muted-foreground">Las gráficas demográficas estarán disponibles próximamente.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
