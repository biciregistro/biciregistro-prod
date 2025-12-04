'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ModalityData {
    name: string;
    count: number;
    percentage: number;
}

export function ModalitiesList({ data }: { data: ModalityData[] }) {
    // Sort descending by count
    const sortedData = [...data].sort((a, b) => b.count - a.count);
    
    const topModality = sortedData[0];
    const others = sortedData.slice(1);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Modalidades</CardTitle>
                <CardDescription>Preferencias de ciclismo de los usuarios.</CardDescription>
            </CardHeader>
            <CardContent>
                {sortedData.length > 0 ? (
                    <div className="space-y-6">
                        {/* Top 1 Hero (Consistent with Top Brands) */}
                        {topModality && (
                            <div className="flex flex-col items-center justify-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-2">
                                    1
                                </div>
                                <h3 className="text-2xl font-bold text-primary">{topModality.name}</h3>
                                <p className="text-muted-foreground font-medium">
                                    {topModality.count} registros ({topModality.percentage.toFixed(1)}%)
                                </p>
                            </div>
                        )}

                        {/* List 2+ */}
                        <div className="space-y-4">
                            {others.map((item, index) => (
                                <div key={item.name} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                                                {index + 2}
                                            </div>
                                            <span className="font-medium">{item.name}</span>
                                        </div>
                                        <span className="text-muted-foreground text-xs">
                                            {item.count} ({item.percentage.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <Progress value={item.percentage} className="h-1.5" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="h-80 flex items-center justify-center">
                        <p className="text-muted-foreground">Sin datos.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
