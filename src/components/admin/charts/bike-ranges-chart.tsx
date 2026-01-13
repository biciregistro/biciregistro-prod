
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BIKE_RANGES } from '@/lib/constants/bike-ranges';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface BikeRangesChartProps {
    data: { name: string; value: number }[]; // Expected format { name: 'mid', value: 10 }
}

export function BikeRangesChart({ data }: BikeRangesChartProps) {
    
    if (!data || data.length === 0) {
        return (
            <Card className="h-full flex flex-col items-center justify-center p-6 text-muted-foreground italic">
                Sin datos de valuación.
            </Card>
        );
    }

    // Transform internal IDs to Labels and Colors
    const chartData = data.map(item => {
        const info = BIKE_RANGES[item.name];
        return {
            name: info ? info.shortLabel : item.name,
            value: item.value,
            color: info ? info.color : '#cbd5e1'
        };
    });

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                     <CardTitle className="text-sm font-medium">Gama de Bicicletas</CardTitle>
                     <CardDescription className="text-xs text-muted-foreground">Distribución por valor</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="h-[250px] pt-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip 
                             formatter={(value: number, name: string) => [`${value} bicicletas`, name]}
                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                             itemStyle={{ color: '#1e293b', fontSize: '12px', fontWeight: 500 }}
                        />
                        <Legend 
                            layout="vertical" 
                            verticalAlign="middle" 
                            align="right"
                            wrapperStyle={{ fontSize: '10px' }}
                            iconSize={8}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
