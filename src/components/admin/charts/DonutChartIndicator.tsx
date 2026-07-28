'use client';

import { ChartDataItem } from '@/lib/types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface DonutChartIndicatorProps {
    title: string;
    data: ChartDataItem[];
    onItemClick: (item: ChartDataItem, title: string) => void;
}

export function DonutChartIndicator({ title, data, onItemClick }: DonutChartIndicatorProps) {
  if (!data || data.length === 0) return <div className="text-center text-sm text-muted-foreground p-4 h-56 flex items-center justify-center">Sin datos</div>;
  
  return (
    <div className="h-56 w-full">
        <p className="text-sm font-medium text-center mb-2">{title}</p>
        <ResponsiveContainer>
            <PieChart>
                <Pie 
                    data={data} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={40} 
                    outerRadius={60} 
                    paddingAngle={3}
                    onClick={(pieData) => onItemClick(pieData.payload as ChartDataItem, title)}
                    cursor="pointer"
                >
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
