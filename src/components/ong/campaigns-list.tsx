'use client';

import { useState, useEffect } from 'react';
import { Campaign, CampaignConversion, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, ExternalLink, Calendar, Users, FileText } from 'lucide-react';
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

    // New states for the UI Table
    const [activeCampaignId, setActiveCampaignId] = useState<string | null>(campaigns.length > 0 ? campaigns[0].id : null);
    const [leadsData, setLeadsData] = useState<CampaignConversion[]>([]);
    const [loadingLeads, setLoadingLeads] = useState<boolean>(false);

    useEffect(() => {
        if (activeCampaignId) {
            loadLeadsForTable(activeCampaignId);
        }
    }, [activeCampaignId]);

    const loadLeadsForTable = async (campaignId: string) => {
        setLoadingLeads(true);
        try {
            const data = await getCampaignLeads(campaignId, advertiserId);
            setLeadsData(data);
        } catch (error) {
            toast({ title: "Error", description: "No se pudieron cargar los registros.", variant: "destructive" });
        } finally {
            setLoadingLeads(false);
        }
    };

    const handleDownloadLeads = async (campaign: Campaign, currentLeads?: CampaignConversion[]) => {
        setDownloadingId(campaign.id);
        try {
            const leads = currentLeads && currentLeads.length > 0 ? currentLeads : await getCampaignLeads(campaign.id, advertiserId);
            
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
                'País',
                'Estado',
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
                    `"${lead.userCountry || ''}"`,
                    `"${lead.userState || ''}"`,
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

    const activeCampaign = campaigns.find(c => c.id === activeCampaignId);

    return (
        <div className="space-y-6">
            {/* Si hay múltiples campañas en la vista de ONG, mostramos un selector simple (botones) */}
            {campaigns.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {campaigns.map(camp => (
                        <Button 
                            key={camp.id} 
                            variant={activeCampaignId === camp.id ? "default" : "outline"}
                            onClick={() => setActiveCampaignId(camp.id)}
                            className="text-xs"
                        >
                            {camp.internalName}
                        </Button>
                    ))}
                </div>
            )}

            {activeCampaign && (
                <Card className="overflow-hidden border-border shadow-sm">
                    <CardHeader className="bg-muted/30 pb-4 border-b">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    {activeCampaign.title}
                                    <Badge variant={activeCampaign.status === 'active' ? 'default' : 'secondary'}>
                                        {activeCampaign.status === 'active' ? 'Activa' : activeCampaign.status}
                                    </Badge>
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    <span className="font-medium text-foreground">{activeCampaign.internalName}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(activeCampaign.startDate), 'd MMM', { locale: es })} - {format(new Date(activeCampaign.endDate), 'd MMM yyyy', { locale: es })}
                                    </span>
                                </CardDescription>
                            </div>
                            <Button 
                                onClick={() => handleDownloadLeads(activeCampaign, leadsData)} 
                                disabled={downloadingId === activeCampaign.id || loadingLeads}
                                variant="outline"
                            >
                                {downloadingId === activeCampaign.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                )}
                                Exportar Base de Datos (CSV)
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/10 border-b">
                            <div className="bg-white p-3 rounded-lg border shadow-sm">
                                <p className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1"><Users className="w-3 h-3" /> Leads Totales</p>
                                <p className="text-2xl font-bold text-primary mt-1">{leadsData.length}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border shadow-sm">
                                <p className="text-xs text-muted-foreground uppercase font-bold">Clics en Banner</p>
                                <p className="text-xl font-bold text-slate-700 mt-1">{activeCampaign.clickCount || 0}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border shadow-sm">
                                <p className="text-xs text-muted-foreground uppercase font-bold">Tipo</p>
                                <p className="text-sm font-medium mt-2 capitalize">{activeCampaign.type === 'giveaway' ? 'Sorteo/Rifa' : activeCampaign.type === 'reward' ? 'Recompensa' : activeCampaign.type}</p>
                            </div>
                             <div className="bg-white p-3 rounded-lg border shadow-sm">
                                <p className="text-xs text-muted-foreground uppercase font-bold">Ubicación</p>
                                <p className="text-sm font-medium mt-2 text-xs truncate" title={activeCampaign.placement}>{activeCampaign.placement}</p>
                            </div>
                        </div>

                        {/* Interactive Data Table */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-muted-foreground" /> 
                                    Registros Capturados
                                </h3>
                                <span className="text-xs text-muted-foreground">Mostrando los más recientes primero</span>
                            </div>

                            {loadingLeads ? (
                                <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                            ) : leadsData.length === 0 ? (
                                <div className="text-center p-8 bg-muted/20 rounded-lg border border-dashed">
                                    <p className="text-sm text-muted-foreground">Aún no hay personas registradas en esta campaña.</p>
                                </div>
                            ) : (
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead>Usuario</TableHead>
                                                <TableHead>Contacto</TableHead>
                                                <TableHead>Ubicación</TableHead>
                                                <TableHead>Estado / Acción</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {leadsData.map((lead) => {
                                                const date = new Date(lead.convertedAt);
                                                
                                                // Definir visualmente la acción en base al tipo de campaña
                                                let actionBadge = "Participó";
                                                let badgeVariant: "default" | "secondary" | "outline" = "secondary";
                                                
                                                if (activeCampaign.type === 'download') {
                                                    actionBadge = "Descargado";
                                                    badgeVariant = "outline";
                                                } else if (activeCampaign.type === 'giveaway') {
                                                    actionBadge = "Boleto Comprado";
                                                    badgeVariant = "default";
                                                } else if (activeCampaign.type === 'reward') {
                                                    actionBadge = "Cupón Adquirido";
                                                    badgeVariant = "default";
                                                }

                                                // Construir string de ubicación de forma segura (ignorar nulos)
                                                const locationString = [lead.userCity, lead.userState, lead.userCountry]
                                                    .filter(Boolean)
                                                    .join(', ') || '-';

                                                return (
                                                    <TableRow key={lead.id}>
                                                        <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                                                            {format(date, 'd MMM yy, HH:mm', { locale: es })}
                                                        </TableCell>
                                                        <TableCell className="font-medium text-sm">
                                                            {lead.userName}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {lead.userEmail}
                                                        </TableCell>
                                                        <TableCell className="text-sm capitalize max-w-[200px] truncate" title={locationString}>
                                                            {locationString}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={badgeVariant} className="text-[10px] whitespace-nowrap">
                                                                {actionBadge}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
