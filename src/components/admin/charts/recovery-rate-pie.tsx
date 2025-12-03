'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface RecoveryData {
    stolen: number;
    recovered: number;
    totalThefts: number;
}

export function RecoveryRatePie({ data }: { data: RecoveryData }) {
    const { stolen, recovered, totalThefts } = data;
    const recoveryRate = totalThefts > 0 ? (recovered / totalThefts) * 100 : 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tasa de Recuperación</CardTitle>
                <CardDescription>Efectividad en la recuperación de activos reportados.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center space-y-6 py-4">
                    {/* Big Percentage */}
                    <div className="text-center">
                        <span className="text-5xl font-bold tracking-tighter text-primary">
                            {recoveryRate.toFixed(1)}%
                        </span>
                        <p className="text-sm text-muted-foreground mt-1">
                            de éxito en recuperación
                        </p>
                    </div>

                    {/* Progress Bar Visual */}
                    <div className="w-full space-y-2">
                        <Progress value={recoveryRate} className="h-3" />
                    </div>

                    {/* Detail Stats */}
                    <div className="grid grid-cols-2 gap-4 w-full pt-2">
                        <div className="flex flex-col items-center p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
                            <ShieldAlert className="h-5 w-5 text-red-500 mb-1" />
                            <span className="text-2xl font-bold text-red-600">{stolen}</span>
                            <span className="text-xs text-muted-foreground">Activas (Robadas)</span>
                        </div>
                        <div className="flex flex-col items-center p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/20">
                            <ShieldCheck className="h-5 w-5 text-green-500 mb-1" />
                            <span className="text-2xl font-bold text-green-600">{recovered}</span>
                            <span className="text-xs text-muted-foreground">Recuperadas</span>
                        </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground text-center">
                        Total de incidentes registrados: {totalThefts}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
