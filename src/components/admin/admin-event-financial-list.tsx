'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Event } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { toggleEventBlockAction } from '@/lib/actions/financial-actions';
import { ExternalLink, ShieldAlert, Loader2 } from 'lucide-react';

interface AdminEventFinancialListProps {
    events: Event[];
}

export function AdminEventFinancialList({ events }: AdminEventFinancialListProps) {
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const { toast } = useToast();

    const handleBlockToggle = async (eventId: string, currentStatus: boolean) => {
        setIsUpdating(eventId);
        const newStatus = !currentStatus;
        
        const result = await toggleEventBlockAction(eventId, newStatus);
        
        if (result.success) {
            toast({
                title: newStatus ? "Evento Bloqueado" : "Evento Desbloqueado",
                description: newStatus ? "Se han restringido las funciones de gestión." : "Se han restaurado las funciones.",
                variant: newStatus ? "destructive" : "default"
            });
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: result.error || "No se pudo actualizar el estado.",
            });
        }
        setIsUpdating(null);
    };

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Gestión de Riesgo y Dispersión</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Evento</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Organizador ID</TableHead>
                                <TableHead>Bloqueo Admin</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {events.map((event) => (
                                <TableRow key={event.id} className={event.isBlocked ? "bg-red-50 dark:bg-red-900/10" : ""}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{event.name}</span>
                                            <span className="text-xs text-muted-foreground" suppressHydrationWarning>{new Date(event.date).toLocaleDateString()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={event.status === 'published' ? 'default' : 'secondary'}>
                                            {event.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {event.ongId.substring(0, 8)}...
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {isUpdating === event.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                            ) : (
                                                <Switch
                                                    checked={event.isBlocked || false}
                                                    onCheckedChange={() => handleBlockToggle(event.id, event.isBlocked || false)}
                                                    className="data-[state=checked]:bg-red-600"
                                                />
                                            )}
                                            {event.isBlocked && <ShieldAlert className="h-4 w-4 text-red-600" />}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/events/${event.id}`} target="_blank">
                                                <ExternalLink className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {events.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No hay eventos registrados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
