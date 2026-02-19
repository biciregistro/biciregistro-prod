'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createCampaign } from '@/lib/actions/campaign-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { CampaignType, CampaignPlacement, CampaignStatus } from '@/lib/types';
import { ImageUpload } from '@/components/shared/image-upload';

interface AdvertiserOption {
    id: string;
    name: string;
}

interface CampaignCreatorProps {
    advertisers: AdvertiserOption[];
    onSuccess?: () => void;
}

export function CampaignCreator({ advertisers, onSuccess }: CampaignCreatorProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        internalName: '',
        advertiserId: '',
        type: 'download' as CampaignType,
        placement: 'dashboard_main' as CampaignPlacement,
        status: 'draft' as CampaignStatus,
        bannerImageUrl: '',
        assetUrl: '', // PDF Link or External Link
        startDate: '',
        endDate: '',
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Basic validation
            if (!formData.title || !formData.advertiserId || !formData.bannerImageUrl || !formData.startDate || !formData.endDate) {
                toast({ title: "Error", description: "Completa los campos obligatorios (*)", variant: "destructive" });
                setLoading(false);
                return;
            }

            if (formData.type === 'download' && !formData.assetUrl) {
                 toast({ title: "Error", description: "Debes subir el archivo descargable.", variant: "destructive" });
                 setLoading(false);
                 return;
            }

            if (new Date(formData.startDate) >= new Date(formData.endDate)) {
                 toast({ title: "Error", description: "La fecha de fin debe ser posterior a la de inicio", variant: "destructive" });
                 setLoading(false);
                 return;
            }

            const result = await createCampaign(formData);

            if (result?.success) {
                toast({ title: "Campaña creada", description: "La campaña se ha guardado exitosamente." });
                // Reset form
                setFormData({
                    title: '',
                    internalName: '',
                    advertiserId: '',
                    type: 'download',
                    placement: 'dashboard_main',
                    status: 'draft',
                    bannerImageUrl: '',
                    assetUrl: '',
                    startDate: '',
                    endDate: '',
                });
                
                if (onSuccess) onSuccess();
            } else {
                toast({ title: "Error", description: result?.error || "Error desconocido", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Ocurrió un error inesperado", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-3xl mx-auto">
            <CardHeader>
                <CardTitle>Nueva Campaña Publicitaria</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="internalName">Nombre Interno *</Label>
                            <Input 
                                id="internalName" 
                                placeholder="Ej. Revista Mayo 2024"
                                value={formData.internalName}
                                onChange={(e) => handleChange('internalName', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="advertiser">Anunciante (ONG) *</Label>
                            <Select onValueChange={(val) => handleChange('advertiserId', val)} value={formData.advertiserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-60 overflow-y-auto">
                                    {advertisers.length > 0 ? (
                                        advertisers.map(adv => (
                                            <SelectItem key={adv.id} value={adv.id}>{adv.name}</SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="no-data" disabled>No hay anunciantes disponibles</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Título Público (Visible en Banner) *</Label>
                        <Input 
                            id="title" 
                            placeholder="Ej. Descarga GRATIS la nueva edición..."
                            value={formData.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo de Acción</Label>
                            <Select onValueChange={(val) => handleChange('type', val)} value={formData.type}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="download">Descarga de Archivo</SelectItem>
                                    <SelectItem value="link">Enlace Externo</SelectItem>
                                    <SelectItem value="coupon">Cupón (Próximamente)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Ubicación</Label>
                            <Select onValueChange={(val) => handleChange('placement', val)} value={formData.placement}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="dashboard_main">Dashboard Principal (Arriba)</SelectItem>
                                    <SelectItem value="dashboard_sidebar">Barra Lateral</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Banner Upload */}
                    <div className="space-y-2 p-4 border rounded-md bg-muted/20">
                        <Label className="mb-2 block">Banner de la Campaña *</Label>
                        <ImageUpload 
                            storagePath="campaign-assets" 
                            onUploadSuccess={(url) => handleChange('bannerImageUrl', url)}
                            buttonText="Subir Imagen Banner"
                            guidelinesText="Recomendado: 1200x300px (JPG, PNG). Máx 5MB."
                        />
                        {formData.bannerImageUrl && (
                            <Input value={formData.bannerImageUrl} readOnly className="mt-2 text-xs bg-muted" />
                        )}
                    </div>

                    {/* Asset / Link Input */}
                    <div className="space-y-2 p-4 border rounded-md bg-muted/20">
                        <Label className="mb-2 block">
                            {formData.type === 'download' ? "Archivo para Descargar *" : "Enlace de Destino *"}
                        </Label>
                        
                        {formData.type === 'download' ? (
                            <div className="space-y-2">
                                <ImageUpload 
                                    storagePath="campaign-assets" 
                                    onUploadSuccess={(url) => handleChange('assetUrl', url)}
                                    buttonText="Subir Archivo (PDF/Doc)"
                                    guidelinesText="Formatos: PDF, ZIP, Imágenes. Máx 10MB."
                                    maxSizeMB={10}
                                />
                                {formData.assetUrl && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-sm text-green-600 font-medium">Archivo cargado:</span>
                                        <a href={formData.assetUrl} target="_blank" className="text-xs underline truncate max-w-xs">{formData.assetUrl}</a>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Input 
                                id="assetUrl" 
                                placeholder="https://mi-sitio.com/promo"
                                value={formData.assetUrl}
                                onChange={(e) => handleChange('assetUrl', e.target.value)}
                            />
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start">Fecha Inicio *</Label>
                            <Input 
                                id="start" 
                                type="datetime-local"
                                value={formData.startDate}
                                onChange={(e) => handleChange('startDate', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end">Fecha Fin *</Label>
                            <Input 
                                id="end" 
                                type="datetime-local"
                                value={formData.endDate}
                                onChange={(e) => handleChange('endDate', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Estado Inicial</Label>
                         <Select onValueChange={(val) => handleChange('status', val)} value={formData.status}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Borrador</SelectItem>
                                    <SelectItem value="active">Activa</SelectItem>
                                    <SelectItem value="paused">Pausada</SelectItem>
                                </SelectContent>
                            </Select>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Campaña
                    </Button>

                </form>
            </CardContent>
        </Card>
    );
}
