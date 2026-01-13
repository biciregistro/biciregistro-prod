
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GENERATIONS, getGenerationId } from '@/lib/constants/generations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useMemo } from 'react';

interface GenerationsChartProps {
    data: { name: string; value: number }[]; // Expected format from analytics data
}

export function GenerationsChart({ data }: GenerationsChartProps) {
    // Colors for the bars
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    if (!data || data.length === 0) {
        return (
            <Card className="h-full flex flex-col items-center justify-center p-6 text-muted-foreground italic">
                Sin datos demográficos suficientes.
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-sm font-medium">Distribución Generacional</CardTitle>
                <CardDescription>Perfil por cohortes de edad</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px] pt-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#64748b' }}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#64748b' }}
                        />
                        <Tooltip 
                            cursor={{ fill: '#f1f5f9' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
