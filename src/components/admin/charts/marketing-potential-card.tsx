'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function MarketingPotentialCard({ 
    contactableUsers, 
    percentage 
}: { 
    contactableUsers: number;
    percentage: number;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Oportunidad Publicitaria
                </CardTitle>
                <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center space-y-6 pt-4 pb-2">
                    <div className="flex flex-col items-center">
                        <span className="text-5xl font-bold tracking-tighter text-blue-600">
                            {contactableUsers}
                        </span>
                        <span className="text-sm text-muted-foreground font-medium text-center mt-1">
                            Usuarios Contactables
                        </span>
                    </div>

                    <div className="w-full space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Consentimiento de Marketing</span>
                            <span>{percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
