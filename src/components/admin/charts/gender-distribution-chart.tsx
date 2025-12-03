'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { User, UserCheck, Users } from 'lucide-react';

// Colors: Blue (Male), Pink/Orange (Female), Yellow/Gray (Other)
const COLORS = ['#3b82f6', '#ec4899', '#eab308', '#9ca3af'];

interface GenderData {
    name: string;
    value: number;
}

export function GenderDistributionChart({ data }: { data: GenderData[] }) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Sort data to ensure consistent color mapping if needed, 
    // though the incoming data is usually sorted by value.
    // Let's rely on incoming sort or sort by predefined keys if we want fixed colors per gender.
    // For now, dynamic is fine.

    return (
        <Card>
            <CardHeader>
                <CardTitle>Género</CardTitle>
                <CardDescription>Distribución de la base de usuarios.</CardDescription>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <div className="flex flex-col space-y-6">
                        {/* Chart Section */}
                        <div className="w-full h-48 relative">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value: number) => {
                                            const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                            return [`${value} (${percent}%)`, 'Usuarios'];
                                        }}
                                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Label */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-bold">{total}</span>
                                <span className="text-xs text-muted-foreground">Total</span>
                            </div>
                        </div>

                        {/* Breakdown Section */}
                        <div className="space-y-3">
                            {data.map((item, index) => {
                                const percent = total > 0 ? (item.value / total) * 100 : 0;
                                const color = COLORS[index % COLORS.length];
                                
                                return (
                                    <div key={item.name} className="flex items-center space-x-3">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                                            <User className="h-4 w-4 text-muted-foreground" style={{ color: color }} />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">{item.name}</span>
                                                <span className="text-muted-foreground">
                                                    {item.value} ({percent.toFixed(1)}%)
                                                </span>
                                            </div>
                                            <Progress 
                                                value={percent} 
                                                className="h-2" 
                                                // Override indicator color via inline style or class if Progress supports it, 
                                                // otherwise it defaults to primary. 
                                                // Shadcn Progress indicator usually takes 'bg-primary'.
                                                // We can use style on the indicator if we had access, but standard Progress is simple.
                                                // Let's just trust the bar visual.
                                            />
                                            {/* Small trick to colorize the progress bar if needed, 
                                                but keeping it standard UI is cleaner. */}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="h-72 flex items-center justify-center">
                        <p className="text-muted-foreground">Sin datos demográficos.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
