'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { GAMIFICATION_RULES, GamificationRuleId } from '@/lib/gamification/constants';
import { getGamificationRules, updateGamificationRules, getStravaSettings, updateStravaSettings } from '@/lib/actions/gamification-actions';
import { Loader2, Save, Activity, Bike } from 'lucide-react';
import { GamificationSettings } from '@/lib/gamification/gamification-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function GamificationRulesEditor() {
    // Estado de reglas de acciones estáticas (B-coins)
    const [rules, setRules] = useState<Record<string, number>>({});
    
    // Estado de configuración de Strava
    const [stravaSettings, setStravaSettings] = useState<GamificationSettings>({
        pointsPerReferral: 50,
        stravaInitialBonusPoints: 100,
        stravaMaxDailyKmLimit: 0,
        stravaConversionRate: 1.0,
        stravaAllowedActivityTypes: ['Ride', 'MountainBikeRide', 'GravelRide', 'E-BikeRide', 'Handcycle'],
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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

    const handleStravaSettingChange = (field: keyof GamificationSettings, value: string | number | string[]) => {
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

    if (loading) return <Loader2 className="h-8 w-8 animate-spin mx-auto mt-10" />;

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
