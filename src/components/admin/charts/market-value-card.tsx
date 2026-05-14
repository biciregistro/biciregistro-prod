'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function MarketValueCard({ 
    totalValue, 
    averageValue 
}: { 
    totalValue: number;
    averageValue: number;
}) {
    // Formatter for large numbers (K, M) with 2 decimals
    // Using 'en-US' locale guarantees the '$' is always on the left in both Node (SSR) and Browser (CSR), preventing Hydration errors.
    const formatTotalCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD', // We use USD solely for the reliable '$' symbol placement.
            notation: "compact",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value).replace('$', '$ '); // Add a small space for better readability like '$ 5.26M'
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Valor Patrimonial
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center space-y-6 pt-4 pb-2">
                    {/* Total Value */}
                    <div className="flex flex-col items-center">
                        <span className="text-5xl font-bold tracking-tighter text-green-600">
                            {formatTotalCurrency(totalValue)}
                        </span>
                        <span className="text-sm text-muted-foreground font-medium">Valor Total Registrado</span>
                    </div>

                    <Separator />

                    {/* Average Ticket */}
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-primary">
                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(averageValue)}
                        </span>
                        <span className="text-sm text-muted-foreground">Valor Promedio por Bici</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
