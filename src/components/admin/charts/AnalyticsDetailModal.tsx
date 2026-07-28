'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface AnalyticsDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    data: { name: string; model?: string; value: number }[];
}

export function AnalyticsDetailModal({ isOpen, onClose, title, data }: AnalyticsDetailModalProps) {
    // Determinar las columnas a mostrar. Si ningún item tiene 'model', no mostramos esa columna.
    const hasModelColumn = data.some(item => item.model);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[625px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Desglose detallado de los items agrupados.
                    </DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                                <TableHead>{hasModelColumn ? 'Marca' : 'Nombre'}</TableHead>
                                {hasModelColumn && <TableHead>Modelo</TableHead>}
                                <TableHead className="text-right">Cantidad</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data && data.length > 0 ? (
                                data.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium truncate">{item.name}</TableCell>
                                        {hasModelColumn && <TableCell className="truncate">{item.model || 'N/A'}</TableCell>}
                                        <TableCell className="text-right">{item.value}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={hasModelColumn ? 3 : 2} className="h-24 text-center">
                                        No hay datos detallados disponibles.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
