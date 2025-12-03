'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface AgeByGender {
    gender: string;
    average: number;
}

export function AverageAgeCard({ 
    averageAge, 
    averageAgeByGender 
}: { 
    averageAge: number;
    averageAgeByGender: AgeByGender[];
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Edad Promedio
                </CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center space-y-6 pt-4 pb-2">
                    {/* Main Average */}
                    <div className="flex flex-col items-center">
                        <span className="text-5xl font-bold tracking-tighter text-primary">
                            {averageAge}
                        </span>
                        <span className="text-sm text-muted-foreground font-medium">Años (Global)</span>
                    </div>

                    {/* Breakdown by Gender */}
                    {averageAgeByGender.length > 0 && (
                        <div className="w-full space-y-3">
                            <Separator />
                            <div className="grid grid-cols-2 gap-2">
                                {averageAgeByGender.map((item) => (
                                    <div key={item.gender} className="flex flex-col items-center p-2 rounded-md bg-muted/50">
                                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                            {item.gender}
                                        </span>
                                        <span className="text-lg font-bold">
                                            {item.average} <span className="text-xs font-normal text-muted-foreground">años</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
