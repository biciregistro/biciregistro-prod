'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface HealthData {
    safe: number;
    stolen: number;
    recovered: number;
}

export function EcosystemHealthBar({ data }: { data: HealthData }) {
    // Total includes recovered bikes as they are part of the ecosystem
    const total = data.safe + data.stolen + data.recovered;
    
    // "Secure" percentage includes safe + recovered
    const safePercentage = total > 0 ? ((data.safe + data.recovered) / total) * 100 : 100;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Salud del Ecosistema</CardTitle>
                <CardDescription>Estado actual del parque vehicular registrado.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-sm font-medium">En Regla</span>
                            </div>
                            <span className="text-sm font-bold">{data.safe.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-sm font-medium">Recuperadas</span>
                            </div>
                            <span className="text-sm font-bold">{data.recovered.toLocaleString()}</span>
                        </div>

                         <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-sm font-medium">Con Alerta</span>
                            </div>
                            <span className="text-sm font-bold">{data.stolen.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div className="pt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Índice de Seguridad Global</span>
                            <span>{safePercentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={safePercentage} className="h-2" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
