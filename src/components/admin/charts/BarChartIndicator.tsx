'use client';

import { ChartDataItem } from '@/lib/types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface BarChartIndicatorProps {
    title: string;
    data: ChartDataItem[];
    onItemClick: (item: ChartDataItem, title: string) => void;
}

export function BarChartIndicator({ title, data, onItemClick }: BarChartIndicatorProps) {
    if (!data || data.length === 0) return <div className="text-center text-sm text-muted-foreground p-4 h-64 flex items-center justify-center">Sin datos</div>;
    
    return (
        <div className="h-64 w-full">
            <p className="text-sm font-medium text-center mb-2">{title}</p>
            <ResponsiveContainer>
                <BarChart 
                    data={data} 
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    onClick={(chartData) => {
                        if (chartData && chartData.activePayload && chartData.activePayload.length > 0) {
                            onItemClick(chartData.activePayload[0].payload as ChartDataItem, title);
                        }
                    }}
                >
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
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} cursor="pointer">
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
