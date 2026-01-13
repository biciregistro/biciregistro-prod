
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BIKE_RANGES, BikeRangeInfo } from '@/lib/constants/bike-ranges';
import { Badge } from '@/components/ui/badge';
import { Trophy, Activity, Wallet, Component } from 'lucide-react';

interface BikeProfileCardProps {
    dominantRangeId: string;
}

export function BikeProfileCard({ dominantRangeId }: BikeProfileCardProps) {
    const info: BikeRangeInfo | undefined = BIKE_RANGES[dominantRangeId];

    if (!info) {
        return (
            <Card className="h-full flex flex-col items-center justify-center p-6 text-muted-foreground italic">
                Sin datos suficientes de gama.
            </Card>
        );
    }

    return (
        <Card className="h-full border-l-4" style={{ borderLeftColor: info.color }}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Trophy className="h-5 w-5" style={{ color: info.color }} />
                        Perfil del Ciclista
                    </CardTitle>
                    <Badge variant="secondary" className="font-mono text-xs">
                        {info.tier}
                    </Badge>
                </div>
                <CardDescription className="text-foreground font-semibold">
                    {info.tierLabel}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground italic">
                    "{info.behavior}"
                </p>

                <div className="grid gap-3 text-sm">
                    <div className="flex gap-3">
                        <Component className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                        <div>
                            <span className="font-semibold block text-xs uppercase text-muted-foreground">Equipamiento Típico</span>
                            <span>{info.features}</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <Activity className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                        <div>
                            <span className="font-semibold block text-xs uppercase text-muted-foreground">Marcas Referencia</span>
                            <span>{info.brands}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Wallet className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                        <div>
                            <span className="font-semibold block text-xs uppercase text-muted-foreground">Rango de Precio</span>
                            <span className="font-mono font-medium">{info.priceRange}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
