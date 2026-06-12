'use client';

import { EventCard } from '../event-card';
import type { Event } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

interface SerialStagesTabProps {
    stages: Event[];
    serialId: string;
}

export function SerialStagesTab({ stages, serialId }: SerialStagesTabProps) {
    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <CardTitle>Etapas del Campeonato</CardTitle>
                    <CardDescription>Gestiona las fechas individuales, boletos y resultados de cada etapa.</CardDescription>
                </div>
                {/* 
                <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/ong/events/create?serialId=${serialId}`}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nueva Etapa
                    </Link>
                </Button>
                */}
            </CardHeader>
            <CardContent>
                {stages.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/5">
                        <p className="text-muted-foreground font-medium">No hay etapas configuradas para este campeonato.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {stages.map((stage) => (
                            <EventCard key={stage.id} event={stage} />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
