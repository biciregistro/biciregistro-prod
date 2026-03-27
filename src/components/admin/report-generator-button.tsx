'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { generateExecutiveSummary } from '@/lib/actions/ai-report-actions';
import { ExecutiveReportModal } from './executive-report-modal';

interface ReportGeneratorButtonProps {
    dashboardData: any; 
}

export function ReportGeneratorButton({ dashboardData }: ReportGeneratorButtonProps) {
    const searchParams = useSearchParams();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reportData, setReportData] = useState<any>(null);

    const filterContext = [
        searchParams.get('country'),
        searchParams.get('state'),
        searchParams.get('city'),
        searchParams.get('brand'),
        searchParams.get('modality'),
        searchParams.get('gender')
    ].filter(Boolean).join(' | ');

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        try {
            // Llamada al Server Action de IA (Sprock) - Pasamos el contexto de filtros para el título
            const aiResponse = await generateExecutiveSummary(dashboardData, filterContext);

            if (!aiResponse.success || !aiResponse.data) {
                throw new Error(aiResponse.error || 'Sprock no pudo generar el reporte estructurado.');
            }

            setReportData(aiResponse.data);
            setIsModalOpen(true);

            toast({
                title: "Reporte Generado",
                description: "La presentación ejecutiva está lista para ser visualizada.",
            });

        } catch (error: any) {
            console.error("Report Generation Error:", error);
            toast({
                variant: "destructive",
                title: "Error al generar reporte",
                description: error.message || "Ocurrió un problema inesperado con Sprock.",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const dateStr = new Date().toLocaleDateString('es-MX', { 
        year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <>
            <div className="flex items-center space-x-2">
                {isGenerating ? (
                    <div className="flex items-center text-sm text-primary animate-pulse bg-primary/10 px-4 py-2 rounded-md font-medium shadow-sm border border-primary/20">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sprock está analizando los datos...
                    </div>
                ) : (
                    <Button onClick={handleGenerateReport} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generar Reporte IA
                    </Button>
                )}
            </div>

            {reportData && (
                <ExecutiveReportModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    reportData={reportData}
                    filterContext={filterContext}
                    dashboardData={dashboardData}
                    date={dateStr}
                />
            )}
        </>
    );
}
