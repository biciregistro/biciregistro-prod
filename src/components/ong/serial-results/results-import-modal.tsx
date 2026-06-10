'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { publishStageResultsAction } from '@/lib/actions/serial-leaderboard-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ResultPayload {
    userId: string;
    categoryId: string;
    position: number;
    totalChipTimeMs?: number;
    userName: string;
    categoryName: string;
}

export function ResultsImportModal({ eventId, serialId }: { eventId: string, serialId: string }) {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'review' | 'submitting'>('idle');
    const [mockResults, setMockResults] = useState<ResultPayload[]>([]);
    const { toast } = useToast();
    const router = useRouter();

    // MOCK: Simulación del motor de IA que extrae resultados
    const simulateAiExtraction = () => {
        setStatus('uploading');
        setTimeout(() => {
            // Datos quemados para cerrar el MVP sin IA
            setMockResults([
                { userId: "user_123", categoryId: "cat_1", position: 1, userName: "Juan Pérez", categoryName: "Master 30" },
                { userId: "user_456", categoryId: "cat_1", position: 2, userName: "Carlos Gómez", categoryName: "Master 30" },
                { userId: "user_789", categoryId: "cat_1", position: 3, userName: "Miguel Angel", categoryName: "Master 30" },
            ]);
            setStatus('review');
        }, 1500);
    };

    const handleSubmit = async () => {
        setStatus('submitting');
        
        const res = await publishStageResultsAction({
            eventId,
            serialId,
            results: mockResults
        });

        if (res.success) {
            toast({
                title: "Resultados Publicados",
                description: "El Leaderboard global ha sido actualizado con éxito.",
                variant: "default"
            });
            setOpen(false);
            setStatus('idle');
            router.refresh();
        } else {
            toast({
                title: "Error al publicar",
                description: res.error,
                variant: "destructive"
            });
            setStatus('review');
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Cargar Resultados
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Importación de Resultados de Etapa</DialogTitle>
                    <DialogDescription>
                        Carga el archivo del proveedor de cronometraje. El sistema calculará los puntos para el Leaderboard del Serial.
                    </DialogDescription>
                </DialogHeader>

                {status === 'idle' && (
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={simulateAiExtraction}>
                        <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-1">Simular Carga de CSV / PDF</h3>
                        <p className="text-sm text-muted-foreground text-center">Haz clic para simular la extracción para el MVP</p>
                    </div>
                )}

                {status === 'uploading' && (
                    <div className="flex flex-col items-center justify-center p-12">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                        <p className="font-medium">Procesando y emparejando placas...</p>
                    </div>
                )}

                {status === 'review' || status === 'submitting' ? (
                    <div className="space-y-4">
                        <Alert className="bg-green-50 border-green-200">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">Análisis completado</AlertTitle>
                            <AlertDescription className="text-green-700">
                                Revisa los datos emparejados antes de publicarlos oficialmente.
                            </AlertDescription>
                        </Alert>

                        <div className="border rounded-md max-h-[300px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white">
                                    <TableRow>
                                        <TableHead>Posición</TableHead>
                                        <TableHead>Corredor</TableHead>
                                        <TableHead>Categoría</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mockResults.map((r, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-bold">{r.position}º</TableCell>
                                            <TableCell>{r.userName}</TableCell>
                                            <TableCell>{r.categoryName}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex justify-end pt-4 gap-3">
                            <Button variant="outline" onClick={() => setStatus('idle')} disabled={status === 'submitting'}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSubmit} disabled={status === 'submitting'} className="bg-orange-600 hover:bg-orange-700 text-white">
                                {status === 'submitting' ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                                Validar y Publicar
                            </Button>
                        </div>
                    </div>
                ) : null}

            </DialogContent>
        </Dialog>
    );
}
