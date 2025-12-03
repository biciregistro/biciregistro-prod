'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';

interface LocationData {
    name: string;
    count: number;
}

export function TopTheftLocationsChart({ data }: { data: LocationData[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Zonas con Mayor Incidencia</CardTitle>
                <CardDescription>Top 10 municipios con más reportes de robo.</CardDescription>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <div className="space-y-4">
                        {data.map((item, index) => (
                            <div key={item.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">{item.name}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    <Badge variant="outline" className="text-sm px-2">
                                        {item.count}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-80 flex items-center justify-center">
                        <p className="text-muted-foreground">No hay datos de ubicación disponibles.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
