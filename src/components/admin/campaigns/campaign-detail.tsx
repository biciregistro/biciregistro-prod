'use client';

import { Campaign } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, PlayCircle, PauseCircle, Loader2, User, Pencil, Trash2 } from 'lucide-react';
import { CampaignsList } from '@/components/ong/campaigns-list'; 
import { updateCampaignStatus, deleteCampaign, getCampaignAnalyticsAction } from '@/lib/actions/campaign-actions';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { EventAnalyticsView } from '@/components/ong/event-analytics-view';
import { EventAnalyticsData } from '@/lib/data/event-analytics';
import { CampaignCreator } from './campaign-creator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
    
    // Edit & Delete States
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

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

    const handleDelete = async () => {
        setDeleteLoading(true);
        const result = await deleteCampaign(campaign.id);
        setDeleteLoading(false);
        
        if (result?.success) {
            toast({ title: "Eliminada", description: "La campaña fue eliminada correctamente." });
            onBack();
        } else {
            toast({ title: "Error", description: result?.error || "No se pudo eliminar la campaña", variant: "destructive" });
        }
    };

    const advertiserName = advertisers.find(a => a.id === campaign.advertiserId)?.name || 'ONG Desconocida';

    if (isEditing) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" onClick={() => setIsEditing(false)} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Cancelar Edición
                </Button>
                {/* 
                  Since CampaignCreator can act as both Creator and Editor if we pass initialData,
                  we render it here. For full edit support, CampaignCreator would need to accept `initialData`.
                  For now, we pass a prop that we'll add to CampaignCreator shortly.
                */}
                <CampaignCreator 
                    advertisers={advertisers} 
                    initialData={campaign} 
                    onSuccess={() => { setIsEditing(false); onUpdate(); }} 
                />
            </div>
        );
    }

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
                            {campaign.type === 'reward' && <Badge variant="outline" className="text-amber-600 border-amber-600">Recompensa</Badge>}
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
                    <div className="flex flex-wrap gap-2">
                        {campaign.status !== 'active' && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleStatusChange('active')} disabled={statusLoading}>
                                {statusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />} Activar
                            </Button>
                        )}
                        {campaign.status === 'active' && (
                            <Button size="sm" variant="secondary" onClick={() => handleStatusChange('paused')} disabled={statusLoading}>
                                {statusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PauseCircle className="mr-2 h-4 w-4" />} Pausar
                            </Button>
                        )}
                        
                        <div className="w-px h-8 bg-border mx-1 hidden sm:block"></div>

                        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </Button>
                    </div>
                )}
            </div>

            {/* Campaign Summary Cards for quick info (Especially useful for Rewards) */}
            {campaign.type === 'reward' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-lg border">
                    <div>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Precio</p>
                        <p className="text-lg font-mono font-bold">{campaign.priceKm} KM</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Stock / Vendidos</p>
                        <p className="text-lg font-bold">
                            {campaign.totalCoupons ? `${campaign.uniqueConversionCount} / ${campaign.totalCoupons}` : `${campaign.uniqueConversionCount} (Ilimitado)`}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Límite Usuario</p>
                        <p className="text-lg font-bold">{campaign.maxPerUser ? campaign.maxPerUser : 'Sin límite'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Vigencia</p>
                        <p className="text-sm font-medium">{new Date(campaign.endDate).toLocaleDateString()}</p>
                    </div>
                </div>
            )}

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

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <Trash2 className="h-5 w-5" /> Eliminar Campaña
                        </DialogTitle>
                        <DialogDescription className="text-base pt-4">
                            Estás a punto de eliminar la campaña <strong>"{campaign.title}"</strong>. 
                            <br /><br />
                            Esta acción es <strong className="text-foreground">irreversible</strong> y eliminará el acceso a la campaña para todos los usuarios. Los datos analíticos también podrían verse afectados.
                            ¿Estás completamente seguro de continuar?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleteLoading}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
                            {deleteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Sí, Eliminar Permanentemente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
