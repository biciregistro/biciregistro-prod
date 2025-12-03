'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BrandData {
    name: string;
    count: number;
}

export function TopStolenBrandsChart({ data }: { data: BrandData[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Top 5 Marcas Robadas</CardTitle>
                <CardDescription>Marcas con mayor incidencia de reportes de robo.</CardDescription>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <div className="space-y-4">
                        {data.map((item, index) => (
                            <div key={item.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    <span className="font-medium text-sm">{item.name}</span>
                                </div>
                                <Badge variant="secondary" className="text-sm px-3">
                                    {item.count} {item.count === 1 ? 'robo' : 'robos'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-80 flex items-center justify-center">
                        <p className="text-muted-foreground">No hay datos de marcas robadas para mostrar.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
