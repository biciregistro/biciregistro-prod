'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { runAnalyticsDenormalizationMigration, exportUniqueBikesCatalogAction } from '@/lib/actions/migration-actions';
import { Loader2, AlertTriangle, CheckCircle2, DownloadCloud } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function MigrationButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleMigration = async (isDryRun: boolean) => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await runAnalyticsDenormalizationMigration(isDryRun);
      setResult(res);
    } catch (error: any) {
      setResult({ success: false, message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCatalog = async () => {
    setIsExporting(true);
    setResult(null);
    try {
      const csvContent = await exportUniqueBikesCatalogAction();
      
      if (!csvContent) {
          setResult({ success: false, message: 'No hay bicicletas registradas para exportar.' });
          return;
      }

      // Crear un Blob con el contenido CSV y forzar descarga
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `catalogo_bicicletas_unico_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setResult({ success: true, message: 'Catálogo de bicicletas exportado exitosamente.' });
    } catch (error: any) {
      setResult({ success: false, message: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 mb-8">
        
        {/* --- NUEVA HERRAMIENTA: EXPORTAR CATÁLOGO ÚNICO --- */}
        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50/50 space-y-4">
            <div className="flex items-center space-x-2 text-blue-700">
                <DownloadCloud className="h-5 w-5" />
                <h3 className="font-semibold">Herramientas de Datos (Machine Learning)</h3>
            </div>
            <p className="text-sm text-slate-600">
                Descarga un archivo CSV limpio con la lista <strong>única</strong> de todas las marcas, modelos y años registrados en la plataforma. 
                Utiliza este archivo para alimentar el sistema de caché híbrido de valuación o para análisis de mercado externo.
            </p>
            <div className="flex space-x-4">
                <Button 
                    variant="default" 
                    onClick={handleExportCatalog}
                    disabled={isExporting}
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
                    disabled={isLoading || isExporting}
                >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Prueba (Dry-Run)
                </Button>
                <Button 
                    variant="destructive" 
                    onClick={() => handleMigration(false)}
                    disabled={isLoading || isExporting}
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
