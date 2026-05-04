'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Target } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { generateExecutiveSummary, generateMarketingSummary } from '@/lib/actions/ai-report-actions';
import { ExecutiveReportModal } from './executive-report-modal';
import { MarketingReportModal } from './marketing-report-modal';

interface ReportGeneratorButtonProps {
    dashboardData: any; 
}

export function ReportGeneratorButton({ dashboardData }: ReportGeneratorButtonProps) {
    const searchParams = useSearchParams();
    
    // Estados para el reporte Ejecutivo original
    const [isGeneratingExecutive, setIsGeneratingExecutive] = useState(false);
    const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState(false);
    const [executiveReportData, setExecutiveReportData] = useState<any>(null);

    // Estados para el nuevo reporte de Marketing
    const [isGeneratingMarketing, setIsGeneratingMarketing] = useState(false);
    const [isMarketingModalOpen, setIsMarketingModalOpen] = useState(false);
    const [marketingReportData, setMarketingReportData] = useState<any>(null);

    const filterContext = [
        searchParams.get('country'),
        searchParams.get('state'),
        searchParams.get('city'),
        searchParams.get('brand'),
        searchParams.get('modality'),
        searchParams.get('range'),
        searchParams.get('gender')
    ].filter(Boolean).join(' | ');

    const dateStr = new Date().toLocaleDateString('es-MX', { 
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const handleGenerateExecutiveReport = async () => {
        setIsGeneratingExecutive(true);
        try {
            const aiResponse = await generateExecutiveSummary(dashboardData, filterContext);
            if (!aiResponse.success || !aiResponse.data) {
                throw new Error(aiResponse.error || 'Sprock no pudo generar el reporte ejecutivo.');
            }
            setExecutiveReportData(aiResponse.data);
            setIsExecutiveModalOpen(true);
            toast({ title: "Reporte Generado", description: "La presentación ejecutiva está lista." });
        } catch (error: any) {
            console.error("Executive Report Generation Error:", error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsGeneratingExecutive(false);
        }
    };

    const handleGenerateMarketingReport = async () => {
        setIsGeneratingMarketing(true);
        try {
            const aiResponse = await generateMarketingSummary(dashboardData, filterContext);
            if (!aiResponse.success || !aiResponse.data) {
                throw new Error(aiResponse.error || 'Sprock no pudo generar el reporte de marketing.');
            }
            setMarketingReportData(aiResponse.data);
            setIsMarketingModalOpen(true);
            toast({ title: "Reporte Generado", description: "El reporte de oportunidades está listo." });
        } catch (error: any) {
            console.error("Marketing Report Generation Error:", error);
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setIsGeneratingMarketing(false);
        }
    };

    return (
        <>
            <div className="flex items-center space-x-3">
                {/* Botón Reporte Ejecutivo (Original) */}
                {isGeneratingExecutive ? (
                    <div className="flex items-center text-sm text-indigo-700 animate-pulse bg-indigo-50 px-4 py-2 rounded-md font-medium shadow-sm border border-indigo-200">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analizando Ecosistema...
                    </div>
                ) : (
                    <Button onClick={handleGenerateExecutiveReport} disabled={isGeneratingMarketing} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Reporte Ejecutivo (IA)
                    </Button>
                )}

                {/* Botón Reporte Marketing (Nuevo) */}
                {isGeneratingMarketing ? (
                    <div className="flex items-center text-sm text-fuchsia-700 animate-pulse bg-fuchsia-50 px-4 py-2 rounded-md font-medium shadow-sm border border-fuchsia-200">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Buscando Oportunidades...
                    </div>
                ) : (
                    <Button onClick={handleGenerateMarketingReport} disabled={isGeneratingExecutive} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white shadow-md transition-all">
                        <Target className="mr-2 h-4 w-4" />
                        Reporte de Oportunidades
                    </Button>
                )}
            </div>

            {executiveReportData && (
                <ExecutiveReportModal 
                    isOpen={isExecutiveModalOpen}
                    onClose={() => setIsExecutiveModalOpen(false)}
                    reportData={executiveReportData}
                    filterContext={filterContext}
                    dashboardData={dashboardData}
                    date={dateStr}
                />
            )}

            {marketingReportData && (
                <MarketingReportModal 
                    isOpen={isMarketingModalOpen}
                    onClose={() => setIsMarketingModalOpen(false)}
                    reportData={marketingReportData}
                    filterContext={filterContext}
                    dashboardData={dashboardData}
                    date={dateStr}
                />
            )}
        </>
    );
}