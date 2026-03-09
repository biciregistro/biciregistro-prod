'use client';

import { Campaign } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, BarChart, Megaphone, Plus, User, Download, Link as LinkIcon, Gift, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CampaignListProps {
    campaigns: Campaign[];
    advertisers: {id: string, name: string}[];
    onCreateNew?: () => void; 
    onManage: (campaign: Campaign) => void;
}

export function CampaignList({ campaigns, advertisers, onCreateNew, onManage }: CampaignListProps) {

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'giveaway':
                return { label: 'Sorteo/Rifa', icon: Ticket, badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' };
            case 'reward':
                return { label: 'Recompensa', icon: Gift, badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' };
            case 'download':
                return { label: 'Descarga/Lead', icon: Download, badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' };
            case 'link':
                return { label: 'Enlace', icon: LinkIcon, badgeClass: 'bg-slate-100 text-slate-800 border-slate-200' };
            default:
                return { label: type, icon: Megaphone, badgeClass: 'bg-slate-100 text-slate-800 border-slate-200' };
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Campañas Activas y Pasadas</h2>
                    <p className="text-sm text-muted-foreground">Gestiona la visibilidad y contenido promocional.</p>
                </div>
                {onCreateNew && (
                    <Button onClick={onCreateNew}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Campaña
                    </Button>
                )}
            </div>

            {campaigns.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/10">
                    <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-50" />
                    {onCreateNew ? (
                        <>
                            <h3 className="text-lg font-medium">No hay campañas creadas</h3>
                            <p className="text-muted-foreground mb-6">Comienza creando la primera campaña publicitaria.</p>
                            <Button onClick={onCreateNew}>Crear Campaña</Button>
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-medium">No tienes campañas activas</h3>
                            <p className="text-muted-foreground mb-6">Contacta al equipo comercial de Biciregistro para anunciarte.</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.map((campaign) => {
                        const advertiserName = advertisers.find(a => a.id === campaign.advertiserId)?.name || 'ONG Desconocida';
                        const TypeIcon = getTypeConfig(campaign.type).icon;
                        const typeConfig = getTypeConfig(campaign.type);
                        
                        return (
                            <Card key={campaign.id} className="group hover:shadow-md transition-shadow flex flex-col">
                                <CardHeader className="pb-3 relative flex-grow">
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider py-0 px-2 flex items-center gap-1 ${typeConfig.badgeClass}`}>
                                            <TypeIcon className="w-3 h-3" />
                                            {typeConfig.label}
                                        </Badge>
                                        <Badge 
                                            variant={campaign.status === 'active' ? 'default' : 'secondary'}
                                            className="shrink-0"
                                        >
                                            {campaign.status === 'active' ? 'Activa' : campaign.status}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-lg line-clamp-2 leading-tight mt-2" title={campaign.title}>
                                        {campaign.title}
                                    </CardTitle>
                                    <CardDescription className="line-clamp-1 mt-1 font-medium">
                                        {campaign.internalName}
                                    </CardDescription>
                                    
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
                                        <User className="h-3 w-3 shrink-0" />
                                        <span className="truncate" title={advertiserName}>
                                            {advertiserName}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="mt-auto">
                                    <div className="space-y-4">
                                        {/* Mini Stats */}
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="bg-muted/50 p-2 rounded border">
                                                <p className="font-semibold text-sm">{campaign.clickCount || 0}</p>
                                                <p className="text-muted-foreground">Clics</p>
                                            </div>
                                            <div className="bg-muted/50 p-2 rounded border">
                                                <p className="font-semibold text-green-600 text-sm">{campaign.uniqueConversionCount || 0}</p>
                                                <p className="text-muted-foreground">{campaign.type === 'giveaway' ? 'Boletos' : campaign.type === 'reward' ? 'Canjes' : 'Leads'}</p>
                                            </div>
                                        </div>

                                        {/* Dates */}
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Inicio: {format(new Date(campaign.startDate), 'd MMM', { locale: es })}</span>
                                            <span>Fin: {format(new Date(campaign.endDate), 'd MMM yyyy', { locale: es })}</span>
                                        </div>

                                        <Button variant="outline" className="w-full" onClick={() => onManage(campaign)}>
                                            <BarChart className="mr-2 h-4 w-4" />
                                            {onCreateNew ? 'Gestionar' : 'Ver Detalles'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
