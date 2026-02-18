'use client';

import { Campaign } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, BarChart, Megaphone, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CampaignListProps {
    campaigns: Campaign[];
    onCreateNew: () => void;
    onManage: (campaign: Campaign) => void;
}

export function CampaignList({ campaigns, onCreateNew, onManage }: CampaignListProps) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Campañas Activas y Pasadas</h2>
                    <p className="text-sm text-muted-foreground">Gestiona la visibilidad y contenido promocional.</p>
                </div>
                <Button onClick={onCreateNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Campaña
                </Button>
            </div>

            {campaigns.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/10">
                    <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">No hay campañas creadas</h3>
                    <p className="text-muted-foreground mb-6">Comienza creando la primera campaña publicitaria.</p>
                    <Button onClick={onCreateNew}>Crear Campaña</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.map((campaign) => (
                        <Card key={campaign.id} className="group hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3 relative">
                                <Badge 
                                    className="absolute top-4 right-4"
                                    variant={campaign.status === 'active' ? 'default' : 'secondary'}
                                >
                                    {campaign.status === 'active' ? 'Activa' : campaign.status}
                                </Badge>
                                <CardTitle className="text-lg pr-12 line-clamp-1" title={campaign.title}>
                                    {campaign.title}
                                </CardTitle>
                                <CardDescription className="line-clamp-1">
                                    {campaign.internalName}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Mini Stats */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-muted p-2 rounded">
                                            <p className="font-semibold">{campaign.clickCount || 0}</p>
                                            <p className="text-muted-foreground">Clics</p>
                                        </div>
                                        <div className="bg-muted p-2 rounded">
                                            <p className="font-semibold text-green-600">{campaign.uniqueConversionCount || 0}</p>
                                            <p className="text-muted-foreground">Leads</p>
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <p className="text-xs text-muted-foreground">
                                        {format(new Date(campaign.startDate), 'd MMM', { locale: es })} - {format(new Date(campaign.endDate), 'd MMM yyyy', { locale: es })}
                                    </p>

                                    <Button variant="outline" className="w-full" onClick={() => onManage(campaign)}>
                                        <BarChart className="mr-2 h-4 w-4" />
                                        Gestionar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
