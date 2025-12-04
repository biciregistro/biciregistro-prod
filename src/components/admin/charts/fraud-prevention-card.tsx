'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchCheck } from 'lucide-react';

export function FraudPreventionCard({ totalSearches }: { totalSearches: number }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Fraudes Evitados
                </CardTitle>
                <SearchCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-48 space-y-2">
                    <span className="text-6xl font-bold tracking-tighter text-primary">
                        {totalSearches}
                    </span>
                    <span className="text-sm text-muted-foreground font-medium text-center">
                        Consultas de Verificación
                    </span>
                    <p className="text-xs text-muted-foreground text-center max-w-[180px] pt-2">
                        Búsquedas de números de serie para validar autenticidad.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
