'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';

interface LocationData {
    name: string;
    count: number;
}

export function TopUserLocationsList({ data }: { data: LocationData[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Ubicación de Usuarios</CardTitle>
                <CardDescription>Top 5 zonas de residencia.</CardDescription>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <div className="space-y-4">
                        {data.map((item, index) => (
                            <div key={item.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    <span className="font-medium text-sm">{item.name}</span>
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
                    <div className="h-64 flex items-center justify-center">
                        <p className="text-muted-foreground">No hay datos de ubicación.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
