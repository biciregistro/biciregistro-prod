'use client';

import { Campaign } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { CampaignsList } from '@/components/ong/campaigns-list'; 

interface CampaignDetailProps {
    campaign: Campaign;
    onBack: () => void;
}

export function CampaignDetail({ campaign, onBack }: CampaignDetailProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-xl font-bold">{campaign.title}</h2>
                    <p className="text-sm text-muted-foreground">Panel de Gestión</p>
                </div>
            </div>

            <Tabs defaultValue="leads">
                <TabsList>
                    <TabsTrigger value="leads">Base de Datos (Leads)</TabsTrigger>
                    <TabsTrigger value="stats">Estadísticas</TabsTrigger>
                </TabsList>
                
                <TabsContent value="leads" className="mt-6">
                    {/* Reusing existing component but just for one campaign. 
                        Note: Ideally we'd have a specific CampaignLeadsTable, 
                        but reusing the ONG list component works as a download shortcut for now.
                    */}
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
