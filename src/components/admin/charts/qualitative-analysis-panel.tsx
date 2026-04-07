'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Loader2, UserMinus, Printer } from 'lucide-react';
import type { DashboardFilters } from '@/lib/types';
import { generateMOAnalysis, generateThiefProfile } from '@/lib/actions/ai-qualitative-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ReactMarkdown from 'react-markdown';

interface QualitativeAnalysisPanelProps {
  filters: DashboardFilters;
}

export function QualitativeAnalysisPanel({ filters }: QualitativeAnalysisPanelProps) {
  const [moIsLoading, setMoIsLoading] = useState(false);
  const [moResult, setMoResult] = useState<string | null>(null);
  const [moError, setMoError] = useState<string | null>(null);

  const [thiefIsLoading, setThiefIsLoading] = useState(false);
  const [thiefResult, setThiefResult] = useState<string | null>(null);
  const [thiefError, setThiefError] = useState<string | null>(null);

  // Invalidate results if filters change
  useEffect(() => {
    setMoResult(null);
    setMoError(null);
    setThiefResult(null);
    setThiefError(null);
  }, [filters]);

  const handleGenerateMO = async () => {
    setMoIsLoading(true);
    setMoError(null);
    try {
      const result = await generateMOAnalysis(filters);
      if (result.success && result.data) {
        setMoResult(result.data);
      } else {
        setMoError(result.error || 'No se pudo generar el análisis.');
      }
    } catch (e) {
      setMoError('Error de conexión.');
    } finally {
      setMoIsLoading(false);
    }
  };

  const handleGenerateThiefProfile = async () => {
    setThiefIsLoading(true);
    setThiefError(null);
    try {
      const result = await generateThiefProfile(filters);
      if (result.success && result.data) {
        setThiefResult(result.data);
      } else {
        setThiefError(result.error || 'No se pudo generar el perfil.');
      }
    } catch (e) {
      setThiefError('Error de conexión.');
    } finally {
      setThiefIsLoading(false);
    }
  };

  // Implementando la Estrategia del README: HTML + Native Print
  const printAsPdf = (elementId: string, title: string) => {
    const contentElement = document.getElementById(elementId);
    if (!contentElement) return;

    const contentHtml = contentElement.innerHTML;
    const printWindow = window.open('', '', 'width=900,height=800');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              @page { size: letter; margin: 20mm; }
              body { 
                font-family: 'Inter', system-ui, -apple-system, sans-serif; 
                color: #000; 
                line-height: 1.6; 
                max-width: 800px; 
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
                margin-bottom: 30px;
              }
              .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
              .header p { margin: 5px 0 0 0; font-size: 14px; color: #555; }
              h2, h3 { 
                color: #111; 
                margin-top: 1.5em; 
                margin-bottom: 0.5em; 
                border-bottom: 1px solid #eee; 
                padding-bottom: 0.3em; 
              }
              p { margin-bottom: 1em; }
              ul, ol { margin-bottom: 1em; padding-left: 2em; }
              li { margin-bottom: 0.5em; }
              strong { font-weight: 600; }
              
              /* Print optimizations */
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
                h2, h3 { page-break-after: avoid; }
                li { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${title}</h1>
              <p>Generado por Plataforma de Inteligencia BiciRegistro - ${new Date().toLocaleDateString()}</p>
            </div>
            ${contentHtml}
            <script>
              // Esperar a que renderice y abrir diálogo de impresión
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 250);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Análisis Cualitativo (IA)</h2>
        <p className="text-muted-foreground">
          Genera inteligencia estructurada procesando cientos de testimonios de las víctimas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Modus Operandi Card */}
        <Card className="flex flex-col h-full border-primary/10">
          <CardHeader className="bg-muted/30">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Análisis de Modus Operandi</CardTitle>
            </div>
            <CardDescription>
              Agrupa y calcula porcentajes de los métodos de robo más comunes en base a las descripciones.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-6 flex flex-col gap-4">
            
            {!moResult && !moIsLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8 space-y-4">
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  Presiona el botón para enviar los datos filtrados a nuestro motor de IA. El proceso puede tomar unos segundos.
                </p>
                <Button onClick={handleGenerateMO}>
                  Generar Análisis de M.O.
                </Button>
              </div>
            )}

            {moIsLoading && (
              <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">Analizando cientos de testimonios...</p>
              </div>
            )}

            {moError && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{moError}</AlertDescription>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setMoError(null)}>Intentar de nuevo</Button>
              </Alert>
            )}

            {moResult && (
              <div className="flex-1 flex flex-col h-full">
                  <div id="mo-report-content" className="flex-1 prose prose-sm prose-slate dark:prose-invert max-w-none overflow-y-auto pr-2 max-h-[500px]">
                    <ReactMarkdown>{moResult}</ReactMarkdown>
                  </div>
                  <div className="mt-6 border-t pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <Button variant="outline" size="sm" onClick={() => printAsPdf('mo-report-content', 'Análisis de Modus Operandi')}>
                          <Printer className="mr-2 h-4 w-4" />
                          Imprimir / Guardar PDF
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setMoResult(null)}>
                          Descartar y Regenerar
                      </Button>
                  </div>
              </div>
            )}
            
          </CardContent>
        </Card>

        {/* Thief Profile Card */}
        <Card className="flex flex-col h-full border-destructive/10">
          <CardHeader className="bg-destructive/5">
            <div className="flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-destructive" />
              <CardTitle className="text-lg">Perfiles de Sospechosos</CardTitle>
            </div>
            <CardDescription>
              Extrae características físicas, vestimenta y patrones de los atacantes descritos por las víctimas.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-6 flex flex-col gap-4">
            
            {!thiefResult && !thiefIsLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8 space-y-4">
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  Procesa las descripciones de los ladrones para identificar bandas, vehículos y vestimenta recurrente.
                </p>
                <Button variant="destructive" onClick={handleGenerateThiefProfile}>
                  Generar Perfilación
                </Button>
              </div>
            )}

            {thiefIsLoading && (
              <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-destructive" />
                <p className="text-sm text-muted-foreground animate-pulse">Extrayendo perfiles criminales...</p>
              </div>
            )}

            {thiefError && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{thiefError}</AlertDescription>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setThiefError(null)}>Intentar de nuevo</Button>
              </Alert>
            )}

            {thiefResult && (
               <div className="flex-1 flex flex-col h-full">
                  <div id="thief-report-content" className="flex-1 prose prose-sm prose-slate dark:prose-invert max-w-none overflow-y-auto pr-2 max-h-[500px]">
                    <ReactMarkdown>{thiefResult}</ReactMarkdown>
                  </div>
                  <div className="mt-6 border-t pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <Button variant="outline" size="sm" onClick={() => printAsPdf('thief-report-content', 'Perfiles de Sospechosos')}>
                          <Printer className="mr-2 h-4 w-4" />
                          Imprimir / Guardar PDF
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setThiefResult(null)}>
                          Descartar y Regenerar
                      </Button>
                  </div>
              </div>
            )}

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
