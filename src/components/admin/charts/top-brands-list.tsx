'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BrandData {
    name: string;
    count: number;
}

export function TopBrandsList({ data }: { data: BrandData[] }) {
    const topBrand = data[0];
    const others = data.slice(1);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Top Marcas</CardTitle>
                <CardDescription>Marcas con mayor presencia en la plataforma.</CardDescription>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <div className="space-y-6">
                        {/* Top 1 Hero */}
                        {topBrand && (
                            <div className="flex flex-col items-center justify-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-2">
                                    1
                                </div>
                                <h3 className="text-2xl font-bold text-primary">{topBrand.name}</h3>
                                <p className="text-muted-foreground font-medium">{topBrand.count} registros</p>
                            </div>
                        )}

                        {/* List 2-10 */}
                        <div className="space-y-3">
                            {others.map((item, index) => (
                                <div key={item.name} className="flex items-center justify-between p-2 border-b last:border-0 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">
                                            {index + 2}
                                        </div>
                                        <span className="font-medium text-sm">{item.name}</span>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                        {item.count}
                                    </Badge>
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
