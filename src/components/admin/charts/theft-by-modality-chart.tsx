'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Vibrant color palette for modalities
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
  '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'
];

interface ModalityData {
    name: string;
    value: number;
}

export function TheftByModalityChart({ data }: { data: ModalityData[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Robos por Modalidad</CardTitle>
                <CardDescription>Distribución de reportes según el tipo de bicicleta.</CardDescription>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    // Increased height to accommodate bottom legend
                    <div className="w-full h-96"> 
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="45%" // Moved slightly up to make room for legend
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(value: number) => [`${value} robos`, '']}
                                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                                />
                                <Legend layout="horizontal" align="center" verticalAlign="bottom" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-80 flex items-center justify-center">
                        <p className="text-muted-foreground">No hay datos de robos para mostrar con los filtros actuales.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
