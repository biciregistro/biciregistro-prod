'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { DollarSign, CreditCard, Wallet, AlertTriangle, CheckCircle2, Calculator } from 'lucide-react';
import type { DetailedFinancialSummary } from '@/lib/financial-data';

export function EventFinancialSummary({ data }: { data: DetailedFinancialSummary }) {
    const isNegative = data.balanceToDisperse < 0;
    
    const f = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

    // Cálculos para la explicación
    const platformIncome = data.platform.gross;
    const platformFees = data.platform.fee;
    const manualFees = data.manual.fee;

    return (
        <div className="space-y-8">
            
            {/* Metrics Grid (Simplificado) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{f(data.total.gross)}</div>
                        <p className="text-xs text-muted-foreground">Bruto acumulado</p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos por Plataforma</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{f(data.platform.gross)}</div>
                        <p className="text-xs text-muted-foreground">Pagos procesados con tarjeta</p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos en Efectivo</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{f(data.manual.gross)}</div>
                        <p className="text-xs text-muted-foreground">Efectivo y/o transferencias</p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cargos de Gestión Totales</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{f(data.total.fee)}</div>
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            <span className="block">{f(data.manual.fee)} por Efectivo</span>
                            <span className="block">{f(data.platform.fee)} por Plataforma</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dispersion / Settlement Box */}
            <Card className={`border-l-4 ${isNegative ? 'border-l-red-500' : 'border-l-green-500'}`}>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Cálculo de Dispersión / Liquidación</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* The Math */}
                    <div className="bg-muted/30 p-4 rounded-lg space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span>Ingresos Totales por Plataforma</span>
                            <span className="font-medium">{f(platformIncome)}</span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                            <span className="flex items-center gap-1">(-) Comisiones por Ingresos Plataforma</span>
                            <span>{f(platformFees)}</span>
                        </div>
                        <div className="flex justify-between items-center text-red-600/80">
                            <span className="flex items-center gap-1">(-) Comisiones por Ingresos Efectivo/Transferencia (Retención)</span>
                            <span>{f(manualFees)}</span>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex justify-between items-center text-lg font-bold pt-2">
                            <span>{isNegative ? "Saldo Pendiente a Pagar" : "Monto a Dispersar"}</span>
                            <span className={isNegative ? "text-red-600" : "text-green-600"}>
                                {f(data.balanceToDisperse)}
                            </span>
                        </div>
                    </div>

                    {/* Status Alert & Action */}
                    <Alert variant={isNegative ? "destructive" : "default"} className={isNegative ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
                        {isNegative ? <AlertTriangle className="h-5 w-5 text-red-600" /> : <CheckCircle2 className="h-5 w-5 text-green-600" />}
                        <AlertTitle className={isNegative ? "text-red-800" : "text-green-800"}>
                            {isNegative ? "Deuda con la Plataforma" : "Saldo a Favor"}
                        </AlertTitle>
                        <AlertDescription className="mt-2">
                            {isNegative ? (
                                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                    <p className="text-sm text-red-700 max-w-xl">
                                        Las comisiones generadas por tus cobros en efectivo exceden el saldo disponible en plataforma.
                                        Debes cubrir esta diferencia para continuar operando.
                                    </p>
                                    <Button variant="destructive">Pagar Deuda Ahora</Button>
                                </div>
                            ) : (
                                <p className="text-sm text-green-700">
                                    Este monto será transferido a tu cuenta bancaria registrada en el próximo corte de dispersión.
                                </p>
                            )}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
}
