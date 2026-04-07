'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { CalendarClock } from 'lucide-react';

interface ModelYearsChartProps {
  data: { year: string; count: number }[];
  averageYear: number;
}

export function ModelYearsChart({ data, averageYear }: ModelYearsChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                Antigüedad del Parque Ciclista
              </CardTitle>
              <CardDescription>Distribución cronológica de años modelo</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No hay datos de año modelo disponibles.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate the age in years relative to current year
  const currentYear = new Date().getFullYear();
  // Validamos para evitar números negativos extraños si hubiese bicis registradas como "del futuro"
  const averageAgeInYears = averageYear > 0 ? Math.max(0, currentYear - averageYear) : 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              Antigüedad del Parque Ciclista
            </CardTitle>
            <CardDescription>Distribución cronológica de años modelo agrupada en periodos de 5 años</CardDescription>
          </div>
          {averageAgeInYears > 0 && (
              <div className="text-right bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
                  <span className="text-2xl font-bold tracking-tight text-primary block leading-none">
                      {averageAgeInYears} {averageAgeInYears === 1 ? 'año' : 'años'}
                  </span>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mt-1">Antigüedad Promedio</p>
              </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-4 pt-4">
        <div className="h-[280px] w-full">
          <ChartContainer 
            config={{
                count: {
                    label: "Bicicletas Registradas",
                    color: "hsl(var(--primary))",
                }
            }}
            className="h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="year" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  dy={10}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                />
                <ChartTooltip 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    content={<ChartTooltipContent indicator="line" />} 
                />
                <Bar 
                  dataKey="count" 
                  fill="var(--color-count)" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
