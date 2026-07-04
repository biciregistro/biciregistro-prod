'use client';

import { ComponentAnalyticsData, ChartDataItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Trophy, Users } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// 1. Reusable Sub-component: Donut Chart
function DonutChartIndicator({ title, data }: { title: string, data: ChartDataItem[] }) {
  if (!data || data.length === 0) return <div className="text-center text-sm text-muted-foreground p-4 h-56 flex items-center justify-center">Sin datos</div>;
  return (
    <div className="h-56 w-full">
        <p className="text-sm font-medium text-center mb-2">{title}</p>
        <ResponsiveContainer>
            <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3}>
                    {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                />
                 <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: "10px", marginTop: '2px'}} iconSize={8}/>
            </PieChart>
        </ResponsiveContainer>
    </div>
  );
}

// 2. Reusable Sub-component: Bar Chart (Now Vertical)
function BarChartIndicator({ title, data }: { title: string, data: ChartDataItem[] }) {
    if (!data || data.length === 0) return <div className="text-center text-sm text-muted-foreground p-4 h-64 flex items-center justify-center">Sin datos</div>;
    return (
        <div className="h-64 w-full">
            <p className="text-sm font-medium text-center mb-2">{title}</p>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                    />
                    <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// 3. Reusable Sub-component: Top List (Updated Style)
function TopListIndicator({ title, data }: { title: string, data: ChartDataItem[] }) {
    if (!data || data.length === 0) return <div className="text-center text-sm text-muted-foreground p-4 h-64 flex items-center justify-center">Sin datos</div>;
    return (
        <div className="h-64 w-full px-1">
             <p className="text-sm font-medium text-center mb-4">{title}</p>
             <div className="space-y-2">
                {data.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className='flex items-center gap-2'>
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs">
                            {index === 0 && <Trophy className="h-3 w-3 text-amber-500" />}
                            {index > 0 && (index + 1)}
                          </div>
                          <span className="font-medium text-xs truncate flex-1">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="font-semibold text-xs text-slate-600">{item.value.toLocaleString()}</span>
                        </div>
                    </div>
                ))}
             </div>
        </div>
    );
}

// 4. Indicator Row Component (Separators Removed)
function IndicatorRow({ title, data, spec }: { title: string, data: any, spec: any }) {
    const renderIndicator = (type: string, title: string, indicatorData: ChartDataItem[]) => {
        switch(type) {
            case 'donut': return <DonutChartIndicator title={title} data={indicatorData} />;
            case 'bar': return <BarChartIndicator title={title} data={indicatorData} />;
            case 'list': return <TopListIndicator title={title} data={indicatorData} />;
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
            />
          )
        })}
      </div>
    </div>
  );
}
