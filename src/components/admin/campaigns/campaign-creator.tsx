'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createCampaign, updateCampaign } from '@/lib/actions/campaign-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Globe, MapPin } from 'lucide-react';
import { CampaignType, CampaignPlacement, CampaignStatus, Campaign, CampaignTargetScope } from '@/lib/types';
import { ImageUpload } from '@/components/shared/image-upload';
import { RewardFieldsSection } from './reward-fields-section';
import { countries } from '@/lib/countries';
import { getCitiesByState } from '@/lib/cities';

interface AdvertiserOption {
    id: string;
    name: string;
}

interface CampaignCreatorProps {
    advertisers: AdvertiserOption[];
    initialData?: Campaign; // Added to support editing
    onSuccess?: () => void;
}

export function CampaignCreator({ advertisers, initialData, onSuccess }: CampaignCreatorProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const isEditing = !!initialData;

    // Helper to format Date to datetime-local expected string
    const formatForInput = (isoString?: string) => {
        if (!isoString) return '';
        try {
            const d = new Date(isoString);
            // shift to local time representation for the input
            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
            return local.toISOString().slice(0, 16);
        } catch {
            return '';
        }
    };

    // Form State initialized with either empty defaults or existing campaign data
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        internalName: initialData?.internalName || '',
        advertiserId: initialData?.advertiserId || '',
        type: (initialData?.type || 'download') as CampaignType,
        placement: (initialData?.placement || 'dashboard_main') as CampaignPlacement,
        status: (initialData?.status || 'draft') as CampaignStatus,
        bannerImageUrl: initialData?.bannerImageUrl || '',
        assetUrl: initialData?.assetUrl || '', 
        startDate: formatForInput(initialData?.startDate),
        endDate: formatForInput(initialData?.endDate),
        // Reward / Giveaway Fields
        priceKm: initialData?.priceKm || 0,
        totalCoupons: initialData?.totalCoupons || 0,
        maxPerUser: initialData?.maxPerUser !== undefined ? initialData.maxPerUser : 1,
        description: initialData?.description || '',
        conditions: initialData?.conditions || '',
        // Segmentation
        targetScope: (initialData?.targetScope || 'global') as CampaignTargetScope,
        targetCountry: initialData?.targetCountry || 'México',
        targetState: initialData?.targetState || ''
    });

    const [availableStates, setAvailableStates] = useState<string[]>([]);

    useEffect(() => {
        const countryData = countries.find(c => c.name === formData.targetCountry);
        setAvailableStates(countryData ? countryData.states : []);
        
        // Reset state if country changes and we're not just loading initial data
        if (!initialData || formData.targetCountry !== initialData.targetCountry) {
             setFormData(prev => ({ ...prev, targetState: '' }));
        }
    }, [formData.targetCountry, initialData]);

    const handleChange = (field: string, value: any) => {
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

            if (formData.type === 'reward' || formData.type === 'giveaway') {
                if (!formData.priceKm || formData.priceKm <= 0) {
                    toast({ title: "Error", description: "Este tipo de campaña requiere un precio en KM mayor a 0.", variant: "destructive" });
                    setLoading(false);
                    return;
                }
                if (!formData.description) {
                    toast({ title: "Error", description: "La campaña requiere una descripción.", variant: "destructive" });
                    setLoading(false);
                    return;
                }
            }

            if (formData.targetScope === 'state') {
                if (!formData.targetCountry || !formData.targetState) {
                    toast({ title: "Error", description: "Selecciona el país y estado para la segmentación.", variant: "destructive" });
                    setLoading(false);
                    return;
                }
            }

            if (new Date(formData.startDate) >= new Date(formData.endDate)) {
                 toast({ title: "Error", description: "La fecha de fin debe ser posterior a la de inicio", variant: "destructive" });
                 setLoading(false);
                 return;
            }

            // Clean payload before sending
            const payload = { ...formData };
            if (payload.type !== 'reward' && payload.type !== 'giveaway') {
                delete (payload as any).priceKm;
                delete (payload as any).totalCoupons;
                delete (payload as any).maxPerUser;
                delete (payload as any).description;
                delete (payload as any).conditions;
            } else if (payload.type === 'giveaway') {
                // Giveaways don't need physical redemption conditions
                delete (payload as any).conditions;
            }

            if (payload.targetScope === 'global') {
                delete (payload as any).targetCountry;
                delete (payload as any).targetState;
            }

            // Proper Date conversion
            const finalPayload = {
                ...payload,
                startDate: new Date(payload.startDate).toISOString(),
                endDate: new Date(payload.endDate).toISOString()
            };

            let result;
            if (isEditing && initialData) {
                result = await updateCampaign(initialData.id, finalPayload);
            } else {
                result = await createCampaign(finalPayload);
            }

            if (result?.success) {
                toast({ title: isEditing ? "Campaña Actualizada" : "Campaña Creada", description: result.message || "Guardado exitosamente." });
                if (!isEditing) {
                    // Reset form only if creating
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
                        priceKm: 0,
                        totalCoupons: 0,
                        maxPerUser: 1,
                        description: '',
                        conditions: '',
                        targetScope: 'global',
                        targetCountry: 'México',
                        targetState: ''
                    });
                }
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
                <CardTitle>{isEditing ? 'Editar Campaña' : 'Nueva Campaña Publicitaria / Beneficio'}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="internalName">Nombre Interno *</Label>
                            <Input 
                                id="internalName" 
                                placeholder="Ej. Termo Juriquilla Julio 2024"
                                value={formData.internalName}
                                onChange={(e) => handleChange('internalName', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="advertiser">Anunciante / Aliado *</Label>
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
                                        <SelectItem value="no-data" disabled>No hay aliados disponibles</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Título Público (Visible por el Ciclista) *</Label>
                        <Input 
                            id="title" 
                            placeholder="Ej. Termo Gratis en tu siguiente visita"
                            value={formData.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
                        <div className="space-y-2">
                            <Label>Tipo de Acción *</Label>
                            <Select onValueChange={(val) => handleChange('type', val)} value={formData.type}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="download">Descarga de Archivo / Lead</SelectItem>
                                    <SelectItem value="link">Enlace Externo</SelectItem>
                                    <SelectItem value="reward">Recompensa Física (Canje Único)</SelectItem>
                                    <SelectItem value="giveaway">Sorteo / Rifa (Múltiples Boletos)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Ubicación</Label>
                            <Select 
                                onValueChange={(val) => handleChange('placement', val)} 
                                value={(formData.type === 'reward' || formData.type === 'giveaway') ? 'event_list' : formData.placement}
                                disabled={formData.type === 'reward' || formData.type === 'giveaway'}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="dashboard_main">Dashboard Principal (Arriba)</SelectItem>
                                    <SelectItem value="dashboard_sidebar">Barra Lateral</SelectItem>
                                    <SelectItem value="event_list">Lista de Recompensas / Eventos</SelectItem>
                                    <SelectItem value="welcome_banner">Banner de Bienvenida (Nuevos Usuarios)</SelectItem>
                                </SelectContent>
                            </Select>
                            {(formData.type === 'reward' || formData.type === 'giveaway') && (
                                <p className="text-xs text-muted-foreground mt-1">Este tipo de campaña va a la pestaña "Mis Recompensas".</p>
                            )}
                        </div>
                    </div>

                    {/* Segmentación Geográfica */}
                    <div className="space-y-4 border-b pb-6">
                        <Label className="text-base font-semibold">Segmentación Geográfica</Label>
                        <p className="text-sm text-muted-foreground">
                            Define quién puede ver esta campaña. Las campañas globales bloquean la ubicación elegida para otros estados.
                        </p>
                        
                        <RadioGroup 
                            value={formData.targetScope} 
                            onValueChange={(val) => handleChange('targetScope', val)}
                            className="flex flex-col gap-3"
                        >
                            <div className="flex items-center space-x-2 border p-3 rounded-md bg-muted/20">
                                <RadioGroupItem value="global" id="scope-global" />
                                <Label htmlFor="scope-global" className="flex items-center gap-2 cursor-pointer w-full font-medium">
                                    <Globe className="w-4 h-4 text-blue-500" />
                                    Global (Todos los usuarios)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2 border p-3 rounded-md bg-muted/20">
                                <RadioGroupItem value="state" id="scope-state" />
                                <Label htmlFor="scope-state" className="flex items-center gap-2 cursor-pointer w-full font-medium">
                                    <MapPin className="w-4 h-4 text-emerald-500" />
                                    Por Estado (Local)
                                </Label>
                            </div>
                        </RadioGroup>

                        {formData.targetScope === 'state' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label>País *</Label>
                                    <Select 
                                        onValueChange={(val) => handleChange('targetCountry', val)} 
                                        value={formData.targetCountry}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Selecciona el país" /></SelectTrigger>
                                        <SelectContent>
                                            {countries.map(c => (
                                                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Estado *</Label>
                                    <Select 
                                        onValueChange={(val) => handleChange('targetState', val)} 
                                        value={formData.targetState}
                                        disabled={!formData.targetCountry || availableStates.length === 0}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Selecciona el estado" /></SelectTrigger>
                                        <SelectContent>
                                            {availableStates.map(state => (
                                                <SelectItem key={state} value={state}>{state}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reward Specific Fields */}
                    {(formData.type === 'reward' || formData.type === 'giveaway') && (
                        <RewardFieldsSection formData={formData} handleChange={handleChange} />
                    )}

                    {/* Banner Upload */}
                    <div className="space-y-2 p-4 border rounded-md bg-muted/20">
                        <Label className="mb-2 block">
                            {(formData.type === 'reward' || formData.type === 'giveaway') ? "Imagen de la Recompensa *" : "Banner de la Campaña *"}
                        </Label>
                        <ImageUpload 
                            storagePath="campaign-assets" 
                            onUploadSuccess={(url) => handleChange('bannerImageUrl', url)}
                            buttonText="Subir Imagen"
                            guidelinesText={(formData.type === 'reward' || formData.type === 'giveaway') ? "Recomendado: 800x600px (4:3) para tarjeta. Máx 2MB." : "Recomendado: 1200x300px. Máx 5MB."}
                        />
                        {formData.bannerImageUrl && (
                            <div className="mt-2 flex items-center gap-2">
                                <img src={formData.bannerImageUrl} alt="Preview" className="h-12 w-auto object-cover rounded shadow-sm border" />
                                <Input value={formData.bannerImageUrl} readOnly className="text-xs bg-muted flex-1" />
                            </div>
                        )}
                    </div>

                    {/* Asset / Link Input (Only for non-rewards) */}
                    {(formData.type !== 'reward' && formData.type !== 'giveaway') && (
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
                                        guidelinesText="Formatos: PDF, ZIP, Imágenes. Máx 20MB."
                                        maxSizeMB={20}
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
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start">Fecha y Hora de Inicio (MX) *</Label>
                            <Input 
                                id="start" 
                                type="datetime-local"
                                value={formData.startDate}
                                onChange={(e) => handleChange('startDate', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end">Fecha y Hora de Fin (MX) *</Label>
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
                        {isEditing ? 'Guardar Cambios' : 'Guardar Configuración'}
                    </Button>

                </form>
            </CardContent>
        </Card>
    );
}
