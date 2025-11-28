'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DollarSign, CreditCard, Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface FinancialSummaryData {
    totalRevenue: number;
    platformRevenue: number;
    manualRevenue: number;
    platformFees: number;
    manualFeesDebt: number;
    netRevenue: number;
    balanceToDisperse: number;
}

export function EventFinancialSummary({ data }: { data: FinancialSummaryData }) {
    const isNegative = data.balanceToDisperse < 0;
    
    // Formatter
    const f = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

    return (
        <div className="space-y-6">
            {/* Balance Alert */}
            <Alert variant={isNegative ? "destructive" : "default"} className={isNegative ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
                {isNegative ? <AlertTriangle className="h-5 w-5 text-red-600" /> : <CheckCircle2 className="h-5 w-5 text-green-600" />}
                <AlertTitle className={isNegative ? "text-red-800" : "text-green-800"}>
                    {isNegative ? "Saldo Pendiente a Pagar" : "Saldo a Favor (Por Dispersar)"}
                </AlertTitle>
                <AlertDescription className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-2 gap-4">
                    <div className="space-y-1">
                        <span className={`text-2xl font-bold ${isNegative ? "text-red-700" : "text-green-700"}`}>
                            {f(Math.abs(data.balanceToDisperse))}
                        </span>
                        {isNegative && (
                            <p className="text-xs text-red-600">
                                Has cobrado más en efectivo de lo que la plataforma ha recaudado. Debes cubrir la diferencia de comisiones.
                            </p>
                        )}
                    </div>
                    {isNegative && (
                        <Button variant="destructive" size="sm">
                            Pagar Deuda Ahora
                        </Button>
                    )}
                </AlertDescription>
            </Alert>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{f(data.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Bruto acumulado</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vía Plataforma</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{f(data.platformRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Pagos con tarjeta</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vía Efectivo</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{f(data.manualRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Pagos directos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comisiones (Deuda)</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{f(data.manualFeesDebt)}</div>
                        <p className="text-xs text-muted-foreground">Por gestión de efectivo</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
