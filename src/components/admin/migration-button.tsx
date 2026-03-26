'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { runAnalyticsDenormalizationMigration } from '@/lib/actions/migration-actions';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function MigrationButton() {
  const [isLoading, setIsLoading] = useState(false);
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

  // El botón ahora será renderizado en producción, pero advertirá de su uso.
  return (
    <div className="p-4 border border-dashed border-red-500 rounded-lg bg-red-50/50 mb-8 space-y-4">
      <div className="flex items-center space-x-2 text-red-600">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="font-semibold">Zona de Peligro: Migración de BD</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Ejecuta el script de desnormalización para actualizar la base de datos y permitir el cruce de filtros en este tablero. <strong>Este proceso consume lecturas/escrituras en Firestore.</strong>
      </p>
      
      <div className="flex space-x-4">
        <Button 
            variant="outline" 
            onClick={() => handleMigration(true)}
            disabled={isLoading}
        >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Prueba (Dry-Run)
        </Button>
        <Button 
            variant="destructive" 
            onClick={() => handleMigration(false)}
            disabled={isLoading}
        >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Ejecutar en BD Real
        </Button>
      </div>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
          {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertTitle>{result.success ? 'Éxito' : 'Error'}</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
