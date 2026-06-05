'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { GAMIFICATION_RULES, GamificationRuleId } from '@/lib/gamification/constants';
import { getGamificationRules, updateGamificationRules, getStravaSettings, updateStravaSettings } from '@/lib/actions/gamification-actions';
import { releaseStravaWaitlist } from '@/lib/actions/strava-actions';
import { Loader2, Save, Activity, Bike, Users, Send } from 'lucide-react';
import { GamificationSettings } from '@/lib/gamification/gamification-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';

export function GamificationRulesEditor() {
    // Estado de reglas de acciones estáticas (B-coins)
    const [rules, setRules] = useState<Record<string, number>>({});
    
    // Estado de configuración de Strava
    const [stravaSettings, setStravaSettings] = useState<GamificationSettings>({
        pointsPerReferral: 50,
        stravaIntegrationEnabled: false,
        stravaInitialBonusPoints: 100,
        stravaMaxDailyKmLimit: 0,
        stravaConversionRate: 1.0,
        stravaAllowedActivityTypes: ['Ride', 'MountainBikeRide', 'GravelRide', 'E-BikeRide', 'Handcycle'],
        stravaConnectionLimit: 10,
        stravaConnectedCount: 0,
        stravaWaitlistCount: 0
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [releasing, setReleasing] = useState(false);
    const [releaseCount, setReleaseCount] = useState(1);
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [rulesData, stravaData] = await Promise.all([
            getGamificationRules(),
            getStravaSettings()
        ]);
        
        setRules((rulesData as Record<string, number>) || {});
        setStravaSettings(stravaData);
        setLoading(false);
    };

    const handlePointChange = (actionId: string, value: string) => {
        const numValue = parseInt(value);
        if (isNaN(numValue)) return;
        setRules(prev => ({ ...prev, [`${actionId}_points`]: numValue }));
    };

    const handleStravaSettingChange = (field: keyof GamificationSettings, value: string | number | string[] | boolean) => {
        setStravaSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveRules = async () => {
        setSaving(true);
        const res = await updateGamificationRules(rules);
        setSaving(false);
        if (res.success) {
            toast({ title: 'Reglas Actualizadas', description: 'Los nuevos valores de B-coins están activos.' });
        } else {
            toast({ title: 'Error', description: 'No se pudieron guardar las reglas.', variant: 'destructive' });
        }
    };

    const handleSaveStrava = async () => {
        setSaving(true);
        const res = await updateStravaSettings(stravaSettings);
        setSaving(false);
        if (res.success) {
            toast({ title: 'Configuración Strava Actualizada', description: 'Las reglas de conversión están activas.' });
        } else {
            toast({ title: 'Error', description: 'No se pudo guardar la configuración de Strava.', variant: 'destructive' });
        }
    };

    const handleReleaseWaitlist = async () => {
        if (releaseCount <= 0 || releaseCount > (stravaSettings.stravaWaitlistCount || 0)) {
            toast({ title: 'Cantidad inválida', description: 'Verifica el número de usuarios a liberar.', variant: 'destructive' });
            return;
        }

        setReleasing(true);
        const res = await releaseStravaWaitlist(releaseCount);
        setReleasing(false);

        if (res.success) {
            toast({ title: '¡Invitaciones Enviadas!', description: res.message });
            loadData(); // Recargar métricas visuales
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' });
        }
    };

    if (loading) return <Loader2 className="h-8 w-8 animate-spin mx-auto mt-10" />;

    const limit = stravaSettings.stravaConnectionLimit || 10;
    const connected = stravaSettings.stravaConnectedCount || 0;
    const waitlist = stravaSettings.stravaWaitlistCount || 0;
    const usagePercent = Math.min((connected / limit) * 100, 100);

    return (
        <Tabs defaultValue="actions" className="space-y-6">
            <TabsList>
                <TabsTrigger value="actions">Acciones de Plataforma</TabsTrigger>
                <TabsTrigger value="strava" className="flex items-center gap-2 text-orange-600 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
                    <Activity className="h-4 w-4" /> Integración Strava
                </TabsTrigger>
            </TabsList>

            <TabsContent value="actions">
                <Card>
                    <CardHeader>
                        <CardTitle>Valores de Recompensa (B-coins)</CardTitle>
                        <CardDescription>Configura cuántas B-coins ganan los usuarios por cada acción dentro de la app.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {Object.values(GAMIFICATION_RULES).map((rule) => {
                            const currentVal = rules[`${rule.id}_points`] ?? rule.defaultPoints;
                            
                            return (
                                <div key={rule.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center border-b pb-4 last:border-0">
                                    <div className="md:col-span-3">
                                        <Label className="text-base font-semibold">{rule.label}</Label>
                                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" 
                                            value={currentVal} 
                                            onChange={(e) => handlePointChange(rule.id, e.target.value)}
                                            className="text-right font-mono"
                                        />
                                        <span className="text-sm font-bold text-muted-foreground w-12">B-coins</span>
                                    </div>
                                </div>
                            );
                        })}

                        <div className="pt-4 flex justify-end">
                            <Button onClick={handleSaveRules} disabled={saving} className="w-full md:w-auto">
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Guardar Acciones
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="strava">
                {/* MÉTRICAS DE CAPACIDAD B2B (Cumplimiento Política 2026 y Waitlist) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="col-span-1 md:col-span-2 shadow-sm border-blue-100">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-500" /> Ocupación de API (Atletas)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-3xl font-black">{connected}</span>
                                <span className="text-muted-foreground mb-1">/ {limit} usuarios</span>
                            </div>
                            <Progress value={usagePercent} className="h-2 mb-2" />
                            <p className="text-xs text-muted-foreground">
                                {usagePercent >= 100 
                                    ? "Límite alcanzado. Las nuevas solicitudes se enviarán a la lista de espera." 
                                    : "Aún hay cupo disponible en el nivel actual."}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-amber-100 bg-amber-50/30 flex flex-col">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-amber-500" /> En Espera</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-between">
                            <div className="text-3xl font-black text-amber-600 mb-4">{waitlist}</div>
                            
                            {/* Panel de Liberación por Lotes */}
                            <div className="bg-white/60 rounded-md p-3 border border-amber-200/50">
                                <Label className="text-xs font-bold text-amber-800 mb-2 block">Liberar Cupos (Enviar Invitación)</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        type="number" 
                                        min="1" 
                                        max={waitlist}
                                        value={releaseCount}
                                        onChange={(e) => setReleaseCount(parseInt(e.target.value) || 1)}
                                        className="w-16 h-8 text-center text-sm border-amber-300"
                                        disabled={waitlist === 0}
                                    />
                                    <Button 
                                        size="sm" 
                                        className="h-8 flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs"
                                        onClick={handleReleaseWaitlist}
                                        disabled={waitlist === 0 || releasing}
                                    >
                                        {releasing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                                        Notificar
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-orange-200 shadow-sm">
                    <CardHeader className="bg-orange-50/50 rounded-t-xl border-b border-orange-100">
                        <CardTitle className="text-orange-900 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-orange-500" />
                            Reglas de Conversión Strava
                        </CardTitle>
                        <CardDescription className="text-orange-800/80">
                            Controla cómo se transforman los kilómetros reales recorridos en la calle en B-coins para la Wallet.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        
                        {/* KILL SWITCH MAESTRO */}
                        <div className="flex flex-row items-center justify-between rounded-lg border border-orange-200 bg-orange-50/50 p-4 shadow-sm">
                            <div className="space-y-0.5">
                                <Label className="text-base font-bold text-orange-900">Activar Integración Strava</Label>
                                <p className="text-sm text-orange-800/80">
                                    Muestra la tarjeta de Strava en el perfil de los ciclistas. Apágalo si estás esperando revisión oficial de marca.
                                </p>
                            </div>
                            <Switch
                                checked={!!stravaSettings.stravaIntegrationEnabled}
                                onCheckedChange={(checked) => handleStravaSettingChange('stravaIntegrationEnabled', checked)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center border-b pb-4">
                            <div className="md:col-span-3">
                                <Label className="text-base font-semibold text-slate-900">Límite Técnico de Atletas</Label>
                                <p className="text-sm text-muted-foreground">Máximo de conexiones permitidas antes de activar la Lista de Espera (Default: 10).</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="number" 
                                    value={stravaSettings.stravaConnectionLimit} 
                                    onChange={(e) => handleStravaSettingChange('stravaConnectionLimit', parseInt(e.target.value) || 0)}
                                    className="text-right font-mono border-orange-200 focus-visible:ring-orange-500"
                                />
                                <span className="text-sm font-bold text-muted-foreground w-12">Users</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center border-b pb-4">
                            <div className="md:col-span-3">
                                <Label className="text-base font-semibold text-slate-900">Bono de Bienvenida Strava</Label>
                                <p className="text-sm text-muted-foreground">Cantidad de B-coins fijas que se otorgan al conectar la cuenta por primera vez.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="number" 
                                    value={stravaSettings.stravaInitialBonusPoints} 
                                    onChange={(e) => handleStravaSettingChange('stravaInitialBonusPoints', parseInt(e.target.value) || 0)}
                                    className="text-right font-mono border-orange-200 focus-visible:ring-orange-500"
                                />
                                <span className="text-sm font-bold text-muted-foreground w-12">B-coins</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center border-b pb-4">
                            <div className="md:col-span-3">
                                <Label className="text-base font-semibold text-slate-900">Tasa de Conversión (Multiplicador)</Label>
                                <p className="text-sm text-muted-foreground">Fórmula: `1 KM en Bici = X B-coins Wallet`. Usa 1 para relación 1 a 1.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-muted-foreground hidden sm:block">x</span>
                                <Input 
                                    type="number" 
                                    step="0.1"
                                    value={stravaSettings.stravaConversionRate} 
                                    onChange={(e) => handleStravaSettingChange('stravaConversionRate', parseFloat(e.target.value) || 1)}
                                    className="text-right font-mono border-orange-200 focus-visible:ring-orange-500"
                                />
                                <span className="text-sm font-bold text-muted-foreground w-12">B-coins</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center border-b pb-4">
                            <div className="md:col-span-3">
                                <Label className="text-base font-semibold text-slate-900">Límite Diario de Sincronización</Label>
                                <p className="text-sm text-muted-foreground">Máximo de KM que se pueden sincronizar en un solo día (0 = sin límite). Evita abusos.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="number" 
                                    value={stravaSettings.stravaMaxDailyKmLimit} 
                                    onChange={(e) => handleStravaSettingChange('stravaMaxDailyKmLimit', parseInt(e.target.value) || 0)}
                                    className="text-right font-mono border-orange-200 focus-visible:ring-orange-500"
                                />
                                <span className="text-sm font-bold text-muted-foreground w-6">Max</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 pt-2">
                            <div>
                                <Label className="text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                    <Bike className="w-4 h-4 text-muted-foreground" /> Tipos de Actividad Permitidos
                                </Label>
                                <p className="text-sm text-muted-foreground mb-3">Las actividades en Strava que no estén en esta lista (ej. VirtualRide, Caminata) serán ignoradas en la sincronización.</p>
                                <Input 
                                    type="text" 
                                    value={stravaSettings.stravaAllowedActivityTypes.join(', ')} 
                                    onChange={(e) => handleStravaSettingChange('stravaAllowedActivityTypes', e.target.value.split(',').map(s => s.trim()))}
                                    className="font-mono text-sm border-orange-200 focus-visible:ring-orange-500"
                                    placeholder="Ride, MountainBikeRide, GravelRide"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button onClick={handleSaveStrava} disabled={saving} className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white">
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Guardar Reglas de Strava
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}
