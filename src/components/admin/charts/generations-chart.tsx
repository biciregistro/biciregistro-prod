
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
        <Card className="h-full border-none shadow-none bg-transparent">
            <CardHeader className="p-0 mb-4">
                <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-tight">Distribución Generacional</CardTitle>
                <CardDescription className="text-[10px]">Perfil por cohortes de edad</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px] p-0">
                <ResponsiveContainer width="100%" height="100%">
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
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
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
