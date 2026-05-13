'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { runAnalyticsDenormalizationMigration, exportUniqueBikesCatalogAction, generateBlueBookAction } from '@/lib/actions/migration-actions';
import { Loader2, AlertTriangle, CheckCircle2, DownloadCloud, BookOpen } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function MigrationButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBlueBookLoading, setIsBlueBookLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleMigration = async (isDryRun: boolean) => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await runAnalyticsDenormalizationMigration(isDryRun);
      setResult(res);
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Error en la migración' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCatalog = async () => {
    setIsExporting(true);
    setResult(null);
    try {
      const response = await exportUniqueBikesCatalogAction();
      
      if (!response.success) {
          setResult({ success: false, message: response.error || 'Error al exportar catálogo.' });
          return;
      }

      if (!response.csv) {
          setResult({ success: false, message: 'No se encontraron bicicletas para exportar.' });
          return;
      }

      const blob = new Blob([response.csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `catalogo_bicicletas_unico_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
      }, 100);

      setResult({ success: true, message: '¡Catálogo descargado con éxito!' });
    } catch (error: any) {
      console.error("Export component error:", error);
      setResult({ success: false, message: 'Ocurrió un fallo en el navegador: ' + (error.message || 'Error desconocido') });
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateBlueBook = async (isDryRun: boolean) => {
    setIsBlueBookLoading(true);
    setResult(null);
    try {
      const res = await generateBlueBookAction(isDryRun);
      setResult(res);
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Error al generar el Libro Azul' });
    } finally {
      setIsBlueBookLoading(false);
    }
  };

  const isAnyLoading = isLoading || isExporting || isBlueBookLoading;

  return (
    <div className="space-y-6 mb-8">
        
        {/* --- NUEVA HERRAMIENTA: LIBRO AZUL (MOTOR RAG) --- */}
        <div className="p-4 border border-indigo-200 rounded-lg bg-indigo-50/50 space-y-4">
            <div className="flex items-center space-x-2 text-indigo-700">
                <BookOpen className="h-5 w-5" />
                <h3 className="font-semibold">Generador de Libro Azul (RAG AI)</h3>
            </div>
            <p className="text-sm text-slate-600">
                Analiza el mercado actual (todas las bicicletas registradas) y genera un diccionario de valuaciones precisas. 
                Sprock IA consultará esta base de datos antes de adivinar el precio de una bicicleta.
            </p>
            <div className="flex space-x-4">
                <Button 
                    variant="outline" 
                    onClick={() => handleGenerateBlueBook(true)}
                    disabled={isAnyLoading}
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                >
                    {isBlueBookLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Prueba (Simulación)
                </Button>
                <Button 
                    variant="default" 
                    onClick={() => handleGenerateBlueBook(false)}
                    disabled={isAnyLoading}
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    {isBlueBookLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
                    {isBlueBookLoading ? 'Generando...' : 'Actualizar Libro Azul'}
                </Button>
            </div>
        </div>

        {/* --- HERRAMIENTA ORIGINAL: EXPORTAR CATÁLOGO ÚNICO --- */}
        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50/50 space-y-4">
            <div className="flex items-center space-x-2 text-blue-700">
                <DownloadCloud className="h-5 w-5" />
                <h3 className="font-semibold">Exportar Catálogo para Machine Learning</h3>
            </div>
            <p className="text-sm text-slate-600">
                Descarga un archivo CSV limpio con la lista <strong>única</strong> de todas las marcas, modelos y años registrados en la plataforma.
            </p>
            <div className="flex space-x-4">
                <Button 
                    variant="default" 
                    onClick={handleExportCatalog}
                    disabled={isAnyLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
                    {isExporting ? 'Exportando...' : 'Descargar Catálogo (CSV)'}
                </Button>
            </div>
        </div>

        {/* --- HERRAMIENTA ORIGINAL: MIGRACIÓN --- */}
        <div className="p-4 border border-dashed border-red-500 rounded-lg bg-red-50/50 space-y-4">
            <div className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-semibold">Zona de Peligro: Migración de Base de Datos</h3>
            </div>
            <p className="text-sm text-muted-foreground">
                Ejecuta el script de desnormalización para actualizar la base de datos y permitir el cruce de filtros en este tablero. <strong>Este proceso consume lecturas/escrituras en Firestore y puede ser costoso.</strong>
            </p>
            
            <div className="flex space-x-4">
                <Button 
                    variant="outline" 
                    onClick={() => handleMigration(true)}
                    disabled={isAnyLoading}
                >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Prueba (Dry-Run)
                </Button>
                <Button 
                    variant="destructive" 
                    onClick={() => handleMigration(false)}
                    disabled={isAnyLoading}
                >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Ejecutar en BD Real
                </Button>
            </div>
        </div>

        {/* --- RESULTADOS --- */}
        {result && (
            <Alert variant={result.success ? "default" : "destructive"} className="mt-4 bg-white shadow-sm">
            {result.success ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
            <AlertTitle>{result.success ? 'Éxito' : 'Error'}</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
            </Alert>
        )}
    </div>
  );
}
