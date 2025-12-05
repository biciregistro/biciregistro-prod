'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import type { Payout } from "@/lib/types";

interface EventPayoutHistoryProps {
    payouts: Payout[];
}

export function EventPayoutHistory({ payouts }: EventPayoutHistoryProps) {
    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Historial de Dispersiones Recibidas</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Referencia / Notas</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead className="text-center">Comprobante</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payouts.length > 0 ? (
                                payouts.map((payout) => (
                                    <TableRow key={payout.id}>
                                        <TableCell>
                                            {new Date(payout.date).toLocaleDateString()}
                                            <span className="block text-xs text-muted-foreground">
                                                {new Date(payout.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={payout.notes}>
                                            {payout.notes || "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-green-600">
                                            {formatCurrency(payout.amount)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="sm" asChild>
                                                <a 
                                                    href={payout.proofUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2"
                                                >
                                                    <FileText className="h-4 w-4" /> Ver
                                                </a>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        No hay pagos registrados para este evento aún.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
