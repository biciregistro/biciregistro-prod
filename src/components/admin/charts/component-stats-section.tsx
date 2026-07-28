'use client';

import { useState } from 'react';
import { ComponentAnalyticsData, ChartDataItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DonutChartIndicator } from './DonutChartIndicator';
import { BarChartIndicator } from './BarChartIndicator';
import { TopListIndicator } from './TopListIndicator';
import { AnalyticsDetailModal } from './AnalyticsDetailModal';

// El componente IndicatorRow ahora necesita pasar el manejador de clics
function IndicatorRow({ title, data, spec, onItemClick }: { title: string, data: any, spec: any, onItemClick: (item: ChartDataItem, title: string) => void }) {
    const renderIndicator = (type: string, title: string, indicatorData: ChartDataItem[]) => {
        switch(type) {
            case 'donut': return <DonutChartIndicator title={title} data={indicatorData} onItemClick={onItemClick} />;
            case 'bar': return <BarChartIndicator title={title} data={indicatorData} onItemClick={onItemClick} />;
            case 'list': return <TopListIndicator title={title} data={indicatorData} onItemClick={onItemClick} />;
            default: return <div className="h-64 flex items-center justify-center text-muted-foreground">Tipo de indicador no válido</div>;
        }
    }
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="pb-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-8 items-start">
                   {renderIndicator(spec.indicator1.type, spec.indicator1.title, data.indicator1)}
                   {renderIndicator(spec.indicator2.type, spec.indicator2.title, data.indicator2)}
                   {renderIndicator(spec.indicator3.type, spec.indicator3.title, data.indicator3)}
                </div>
            </CardContent>
        </Card>
    )
}

const INDICATOR_SPECS = {
    frameMaterial: {
        title: "Material del Cuadro",
        indicator1: { type: 'donut', title: "Distribución de Materiales" },
        indicator2: { type: 'list', title: "Top Marcas (Carbono)" },
        indicator3: { type: 'list', title: "Top Marcas (Aluminio)" },
    },
    brakes: {
        title: "Frenos",
        indicator1: { type: 'donut', title: "Distribución de Marcas" },
        indicator2: { type: 'list', title: "Top 5 Modelos" },
        indicator3: { type: 'list', title: "Top Marcas de Bicis que los Usan" },
    },
    drivetrain: {
        title: "Transmisión",
        indicator1: { type: 'donut', title: "Distribución de Marcas" },
        indicator2: { type: 'list', title: "Top 5 Modelos" },
        indicator3: { type: 'bar', title: "Uso por Categoría de Bici" },
    },
    fork: {
        title: "Horquilla (Suspensión Delantera)",
        indicator1: { type: 'donut', title: "Distribución de Marcas" },
        indicator2: { type: 'list', title: "Top 5 Modelos" },
        indicator3: { type: 'donut', title: "Suspensión vs. Rígida" },
    },
    shock: {
        title: "Amortiguador Trasero",
        indicator1: { type: 'donut', title: "Distribución de Marcas" },
        indicator2: { type: 'list', title: "Top 5 Modelos" },
        indicator3: { type: 'donut', title: "Rígidas vs. Doble Suspensión" },
    },
    tires: {
        title: "Llantas",
        indicator1: { type: 'donut', title: "Distribución de Marcas" },
        indicator2: { type: 'list', title: "Top 5 Modelos" },
        indicator3: { type: 'list', title: "Top Marcas de Bicis que las Usan" },
    },
    grips: {
        title: "Puños",
        indicator1: { type: 'donut', title: "Distribución de Marcas" },
        indicator2: { type: 'list', title: "Top 5 Marcas" },
        indicator3: { type: 'bar', title: "Uso por Categoría de Bici" },
    },
    saddle: {
        title: "Sillines",
        indicator1: { type: 'donut', title: "Distribución de Marcas" },
        indicator2: { type: 'list', title: "Top 5 Marcas" },
        indicator3: { type: 'list', title: "Top Marcas de Bicis que los Usan" },
    },
    pedals: {
        title: "Pedales",
        indicator1: { type: 'donut', title: "Distribución de Marcas" },
        indicator2: { type: 'list', title: "Top 5 Modelos" },
        indicator3: { type: 'list', title: "Top Marcas de Bicis que los Usan" },
    },
};


export function ComponentStatsSection({ data }: { data: ComponentAnalyticsData }) {
    const [modalData, setModalData] = useState<{ title: string; data: any[] } | null>(null);

    const handleItemClick = (item: ChartDataItem, chartTitle: string) => {
        if (item.detailedData && item.detailedData.length > 0) {
            const modalTitle = `Detalle de "${item.name}" para ${chartTitle}`;
            setModalData({ title: modalTitle, data: item.detailedData });
        }
    };

    if (!data || data.totalBikes === 0) {
        return (
             <div className="space-y-6">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Indicadores de Componentes en el Mercado</h2>
                    <p className="text-muted-foreground">
                    Análisis de la distribución y popularidad de los componentes de bicicletas.
                    </p>
                </div>
                <Card className="flex items-center justify-center h-48">
                    <p className="text-muted-foreground">Sin registros suficientes para este segmento.</p>
                </Card>
            </div>
        )
    }

  const indicatorKeys = Object.keys(INDICATOR_SPECS) as (keyof typeof INDICATOR_SPECS)[];

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Indicadores de Componentes en el Mercado</h2>
          <p className="text-muted-foreground">
            Análisis de la distribución y popularidad de los componentes de bicicletas. Universo analizado: {data.totalBikes.toLocaleString()} bicicletas.
          </p>
        </div>
        
        <div className="space-y-4">
          {indicatorKeys.map(key => {
            if (!data[key]) return null;
            return (
              <IndicatorRow 
                  key={key}
                  title={INDICATOR_SPECS[key].title}
                  data={data[key]}
                  spec={INDICATOR_SPECS[key]}
                  onItemClick={handleItemClick}
              />
            )
          })}
        </div>
      </div>

      {modalData && (
          <AnalyticsDetailModal
              isOpen={!!modalData}
              onClose={() => setModalData(null)}
              title={modalData.title}
              data={modalData.data}
          />
      )}
    </>
  );
}
