'use client';

import { useState } from 'react';
import { Campaign, CampaignConversion } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, ExternalLink, Calendar } from 'lucide-react';
import { getCampaignLeads } from '@/lib/actions/campaign-actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CampaignsListProps {
    campaigns: Campaign[];
    advertiserId: string;
}

export function CampaignsList({ campaigns, advertiserId }: CampaignsListProps) {
    const { toast } = useToast();
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const handleDownloadLeads = async (campaign: Campaign) => {
        setDownloadingId(campaign.id);
        try {
            const leads = await getCampaignLeads(campaign.id, advertiserId);
            
            if (leads.length === 0) {
                toast({
                    title: "Sin datos",
                    description: "Aún no hay registros para esta campaña.",
                });
                return;
            }

            // Generate CSV with Legal Requirements
            const headers = [
                'ID Usuario',
                'Nombre',
                'Email',
                'Ciudad',
                'Timestamp (Fecha/Hora)',
                'IP del Dispositivo',
                'Fuente de Captura',
                'Texto del Consentimiento',
                'Versión Aviso Privacidad',
                'Acción Afirmativa',
                'Dispositivo'
            ];

            const csvContent = [
                headers.join(','),
                ...leads.map(lead => [
                    lead.userId,
                    `"${lead.userName}"`, 
                    lead.userEmail,
                    `"${lead.userCity || ''}"`,
                    lead.convertedAt, // ISO 8601 for legal proof
                    lead.ipAddress || 'No Registrada',
                    `"Campaña: ${campaign.internalName}"`,
                    `"${lead.consent?.text.replace(/"/g, '""') || ''}"`, // Escape quotes
                    lead.privacyPolicyVersion || 'Desconocida',
                    lead.consent?.accepted ? 'CHECKBOX_OPT_IN' : 'FALSE',
                    lead.metadata?.deviceType || 'Desconocido'
                ].join(','))
            ].join('\n');

            // Trigger Download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `leads_${campaign.internalName}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({
                title: "Descarga completa",
                description: `Se han exportado ${leads.length} registros.`,
            });

        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "No se pudieron descargar los datos.",
                variant: "destructive",
            });
        } finally {
            setDownloadingId(null);
        }
    };

    if (campaigns.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                    <p className="text-muted-foreground mb-4">No tienes campañas activas asignadas.</p>
                    <p className="text-sm text-gray-500">Contacta al administrador para lanzar tu primera campaña.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {campaigns.map((campaign) => (
                <Card key={campaign.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/30 pb-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    {campaign.title}
                                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                                        {campaign.status === 'active' ? 'Activa' : campaign.status}
                                    </Badge>
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    <span className="font-medium text-foreground">{campaign.internalName}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(campaign.startDate), 'd MMM', { locale: es })} - {format(new Date(campaign.endDate), 'd MMM yyyy', { locale: es })}
                                    </span>
                                </CardDescription>
                            </div>
                            <Button 
                                onClick={() => handleDownloadLeads(campaign)} 
                                disabled={downloadingId === campaign.id}
                                variant="outline"
                            >
                                {downloadingId === campaign.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                )}
                                Exportar Base de Datos
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-slate-50 p-3 rounded-lg border">
                                <p className="text-xs text-muted-foreground uppercase font-bold">Clics Totales</p>
                                <p className="text-2xl font-bold text-primary">{campaign.clickCount || 0}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border">
                                <p className="text-xs text-muted-foreground uppercase font-bold">Leads Únicos</p>
                                <p className="text-2xl font-bold text-green-600">{campaign.uniqueConversionCount || 0}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border">
                                <p className="text-xs text-muted-foreground uppercase font-bold">Tipo</p>
                                <p className="text-sm font-medium mt-1 capitalize">{campaign.type}</p>
                            </div>
                             <div className="bg-slate-50 p-3 rounded-lg border">
                                <p className="text-xs text-muted-foreground uppercase font-bold">Ubicación</p>
                                <p className="text-sm font-medium mt-1 text-xs truncate" title={campaign.placement}>{campaign.placement}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
