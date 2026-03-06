'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { GAMIFICATION_RULES, GamificationRuleId } from '@/lib/gamification/constants';
import { getGamificationRules, updateGamificationRules } from '@/lib/actions/gamification-actions';
import { Loader2, Save } from 'lucide-react';

export function GamificationRulesEditor() {
    const [rules, setRules] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        const data = await getGamificationRules();
        // Ensure data matches the expected type and handle undefined
        setRules((data as Record<string, number>) || {});
        setLoading(false);
    };

    const handlePointChange = (actionId: string, value: string) => {
        const numValue = parseInt(value);
        if (isNaN(numValue)) return;
        setRules(prev => ({ ...prev, [`${actionId}_points`]: numValue }));
    };

    const handleSave = async () => {
        setSaving(true);
        const res = await updateGamificationRules(rules);
        setSaving(false);
        if (res.success) {
            toast({ title: 'Reglas Actualizadas', description: 'Los nuevos valores de KM están activos.' });
        } else {
            toast({ title: 'Error', description: 'No se pudieron guardar los cambios.', variant: 'destructive' });
        }
    };

    if (loading) return <Loader2 className="h-8 w-8 animate-spin mx-auto mt-10" />;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Valores de Recompensa (KM)</CardTitle>
                <CardDescription>Configura cuántos kilómetros ganan los usuarios por cada acción.</CardDescription>
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
                                <span className="text-sm font-bold text-muted-foreground">KM</span>
                            </div>
                        </div>
                    );
                })}

                <div className="pt-4 flex justify-end">
                    <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Cambios
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
