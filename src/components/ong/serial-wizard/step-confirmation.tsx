'use client';

import { useFormContext } from 'react-hook-form';
import { Trophy, Calendar, Users, Info, Settings, Tag, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function StepConfirmation() {
  const { getValues } = useFormContext();
  const values = getValues();

  const formatDate = (dateStr: string) => {
      if (!dateStr) return 'Fecha no definida';
      return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', { 
          year: 'numeric', month: 'long', day: 'numeric' 
      });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div>
        <h2 className="text-xl font-semibold mb-1">Resumen del Campeonato</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Revisa la configuración. Una vez creado, se generará la página pública y los borradores de las etapas.
        </p>
      </div>

      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary font-bold">Importante</AlertTitle>
        <AlertDescription className="text-primary/80">
          Al finalizar, el sistema asignará a todos los inscritos de estas etapas dentro de la misma lógica de "Número de Placa Permanente". 
          Si borras una etapa después, los corredores mantendrán su número.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Datos Generales
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div>
                    <p className="text-xs text-muted-foreground">Nombre</p>
                    <p className="font-semibold text-lg">{values.name || 'No especificado'}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">URL (Slug)</p>
                    <p className="font-mono text-sm text-blue-600 bg-blue-50/50 rounded px-2 py-1 w-fit">/serial/{values.slug}</p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t mt-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Activity className="w-4 h-4" />
                        <span>Modalidad / Nivel</span>
                    </div>
                    <span className="font-bold text-sm text-right">{values.modality} • {values.level}</span>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Tag className="w-4 h-4" />
                        <span>Categorías Oficiales</span>
                    </div>
                    <span className="font-bold">{values.categories?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>Cupo Global</span>
                    </div>
                    <span className="font-bold">{values.maxParticipantsGlobal || 'Ilimitado'}</span>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Cronograma ({values.stages?.length || 0} Fechas)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                    {values.stages?.map((stage: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 rounded-lg border bg-muted/10">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                                    Etapa {index + 1}
                                </span>
                                <span className="font-medium">{formatDate(stage.date)}</span>
                            </div>
                            <div className="text-right flex flex-col">
                                <span className="text-xs text-muted-foreground">Boleto Base</span>
                                <span className="font-bold text-primary">
                                    {stage.price > 0 ? `$${stage.price} MXN` : 'Gratis'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
