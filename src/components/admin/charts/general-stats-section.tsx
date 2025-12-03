'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Bike, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface GeneralStatsData {
    totalUsers: number;
    totalBikes: number;
    activeUsers: number;
    dailyGrowth: { date: string; count: number }[];
}

function StatCard({ title, value, icon: Icon, description }: { title: string, value: number | string, icon: any, description?: string }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

export function GeneralStatsSection({ data }: { data: GeneralStatsData }) {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">Resumen General</h2>
                <p className="text-muted-foreground">
                    Panorama del crecimiento y actividad de la plataforma en los últimos 30 días.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <StatCard 
                    title="Usuarios Registrados" 
                    value={data.totalUsers} 
                    icon={Users} 
                    description="Total histórico"
                />
                <StatCard 
                    title="Bicicletas Registradas" 
                    value={data.totalBikes} 
                    icon={Bike} 
                    description="Total histórico"
                />
                <StatCard 
                    title="Usuarios Activos" 
                    value={data.activeUsers > 0 ? data.activeUsers : "—"} 
                    icon={Activity} 
                    description="Inicios de sesión (Últimos 30 días)"
                />
            </div>

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Crecimiento de Usuarios</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    {data.dailyGrowth.length > 0 ? (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={data.dailyGrowth}
                                    margin={{
                                        top: 5,
                                        right: 30,
                                        left: 20,
                                        bottom: 5,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis 
                                        dataKey="date" 
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="count" 
                                        stroke="hsl(var(--primary))" 
                                        fill="hsl(var(--primary))" 
                                        fillOpacity={0.2} 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[300px] w-full flex items-center justify-center bg-muted/10 rounded-md border border-dashed">
                            <div className="text-center">
                                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                                <p className="text-muted-foreground">
                                    No hay datos históricos suficientes para mostrar la tendencia de crecimiento.
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
