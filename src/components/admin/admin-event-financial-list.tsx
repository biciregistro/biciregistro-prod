'use client';

import { useState, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Event } from '@/lib/types';
import { ExternalLink, ShieldAlert, Loader2, ChevronDown, ChevronUp, DollarSign, Users, MapPin, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Wallet, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleEventBlockAction as toggleAction } from '@/lib/actions/financial-actions';
import { PayoutManagerModal } from './payout-manager-modal';
import { useRouter } from 'next/navigation';

// Define interface locally to avoid importing from 'server-only' file
export interface AdminEventFinancialView extends Event {
    ongName: string;
    totalCollected: number;
    platformCollected: number;
    manualCollected: number;
    amountDispersed: number;
    pendingDisbursement: number;
    revenue?: {
        net: number;
        iva: number;
        mpCost: number;
    }
}

interface AdminEventFinancialListProps {
    events: AdminEventFinancialView[];
}

type SortDirection = 'asc' | 'desc' | null;
type SortConfig = { key: string | null; direction: SortDirection };

export function AdminEventFinancialList({ events }: AdminEventFinancialListProps) {
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
    
    // Payout Modal State
    const [selectedEventForPayout, setSelectedEventForPayout] = useState<AdminEventFinancialView | null>(null);
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

    const { toast } = useToast();
    const router = useRouter(); // For manual refresh

    // Sorting Logic
    const sortedEvents = useMemo(() => {
        const data = [...events];
        
        // 1. Explicit Sort by Column
        if (sortConfig.key && sortConfig.direction) {
            return data.sort((a, b) => {
                const key = sortConfig.key!;
                const dir = sortConfig.direction === 'asc' ? 1 : -1;
                
                let valA: any;
                let valB: any;

                // Handle derived or specific fields
                if (key === 'status') {
                    const getStatusLabel = (e: AdminEventFinancialView) => {
                         const date = new Date(e.date);
                         const isPub = e.status === 'published';
                         const isFin = isPub && date < new Date();
                         if (isPub && !isFin) return "Activo";
                         if (isFin) return "Finalizado";
                         return "Borrador";
                    };
                    valA = getStatusLabel(a);
                    valB = getStatusLabel(b);
                } else if (key === 'brRevenue') {
                    valA = (a.revenue?.net || 0) + (a.revenue?.iva || 0);
                    valB = (b.revenue?.net || 0) + (b.revenue?.iva || 0);
                } else {
                    // Direct property access
                    valA = a[key as keyof AdminEventFinancialView];
                    valB = b[key as keyof AdminEventFinancialView];
                }

                if (typeof valA === 'string' && typeof valB === 'string') {
                    return valA.localeCompare(valB) * dir;
                }
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return (valA - valB) * dir;
                }
                // Fallback
                return 0;
            });
        }

        // 2. Default "Natural" Sort Logic
        const now = new Date();
        return data.sort((a, b) => {
            const aDate = new Date(a.date);
            const bDate = new Date(b.date);
            
            const aPublished = a.status === 'published';
            const bPublished = b.status === 'published';
            
            const aFinished = aPublished && aDate < now;
            const bFinished = bPublished && bDate < now;
            
            const aActive = aPublished && !aFinished;
            const bActive = bPublished && !bFinished;

            // Priority: Active events first
            if (aActive && !bActive) return -1;
            if (!aActive && bActive) return 1;

            // Priority: Finished events second
            if (aFinished && !bFinished) return -1; 
            if (!aFinished && bFinished) return 1;

            // Priority: Date (Newest first)
            return bDate.getTime() - aDate.getTime();
        });
    }, [events, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current.key === key) {
                if (current.direction === 'asc') return { key, direction: 'desc' };
                if (current.direction === 'desc') return { key: null, direction: null };
            }
            return { key, direction: 'asc' };
        });
    };

    const handleBlockToggle = async (eventId: string, currentStatus: boolean) => {
        setIsUpdating(eventId);
        const newStatus = !currentStatus;
        
        const result = await toggleAction(eventId, newStatus);
        
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

    const toggleExpand = (eventId: string) => {
        setExpandedEventId(prev => prev === eventId ? null : eventId);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
    };

    // Helper Component for Sortable Header
    const SortableHeader = ({ label, columnKey, className }: { label: string, columnKey: string, className?: string }) => {
        const isActive = sortConfig.key === columnKey;
        const Icon = isActive 
            ? (sortConfig.direction === 'asc' ? ArrowUp : ArrowDown) 
            : ArrowUpDown;
        
        return (
            <TableHead 
                className={cn("cursor-pointer select-none hover:bg-muted/50 transition-colors", className)}
                onClick={() => handleSort(columnKey)}
            >
                <div className={cn("flex items-center gap-1", className?.includes("text-right") && "justify-end", className?.includes("text-center") && "justify-center")}>
                    {label}
                    <Icon className={cn("h-3 w-3", isActive ? "text-primary" : "text-muted-foreground/50")} />
                </div>
            </TableHead>
        );
    };

    const openPayoutModal = (event: AdminEventFinancialView) => {
        setSelectedEventForPayout(event);
        setIsPayoutModalOpen(true);
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
                                <TableHead className="w-[50px]"></TableHead>
                                <SortableHeader label="Evento" columnKey="name" />
                                <SortableHeader label="Organización" columnKey="ongName" />
                                <SortableHeader label="Tipo" columnKey="costType" />
                                <SortableHeader label="Recaudado" columnKey="totalCollected" className="text-right" />
                                <SortableHeader label="Por Dispersar" columnKey="pendingDisbursement" className="text-right" />
                                <SortableHeader label="Utilidad BR" columnKey="brRevenue" className="text-right" />
                                <SortableHeader label="Estado" columnKey="status" className="text-center" />
                                <TableHead className="text-center">Bloqueo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedEvents.map((event) => {
                                const isExpanded = expandedEventId === event.id;
                                const isFree = event.costType === 'Gratuito';
                                const isNegativeBalance = event.pendingDisbursement < 0;
                                const revenue = event.revenue;
                                const grossRevenue = (revenue?.net || 0) + (revenue?.iva || 0) + (revenue?.mpCost || 0);
                                const netRevenue = (revenue?.net || 0) + (revenue?.iva || 0);
                                
                                // Determine Real Status
                                const eventDate = new Date(event.date);
                                const isPublished = event.status === 'published';
                                const isFinished = isPublished && eventDate < new Date();
                                const isActive = isPublished && !isFinished;

                                let statusLabel = "Borrador";
                                let statusVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
                                
                                if (isActive) {
                                    statusLabel = "Activo";
                                    statusVariant = "default";
                                } else if (isFinished) {
                                    statusLabel = "Finalizado";
                                    statusVariant = "outline";
                                }

                                return (
                                    <Fragment key={event.id}>
                                        <TableRow 
                                            className={cn(
                                                "cursor-pointer hover:bg-muted/50 transition-colors",
                                                event.isBlocked && "bg-gray-100 dark:bg-gray-800/50",
                                                isNegativeBalance && "bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30"
                                            )}
                                            onClick={() => toggleExpand(event.id)}
                                        >
                                            <TableCell>
                                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{event.name}</span>
                                                    <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                                                        {eventDate.toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-primary">
                                                        {event.ongName}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={isFree ? "outline" : "secondary"} className={isFree ? "border-green-500 text-green-600" : ""}>
                                                    {isFree ? "Gratuito" : "De Pago"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {isFree ? "-" : formatCurrency(event.totalCollected)}
                                            </TableCell>
                                            <TableCell className={cn(
                                                "text-right font-medium",
                                                isNegativeBalance ? "text-red-600 font-bold" : "text-orange-600"
                                            )}>
                                                {isFree ? "-" : formatCurrency(event.pendingDisbursement)}
                                            </TableCell>
                                            <TableCell className="text-right text-green-700 font-medium">
                                                {isFree ? "-" : formatCurrency(netRevenue)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={statusVariant}>
                                                    {statusLabel}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-center items-center gap-2">
                                                    {isUpdating === event.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                    ) : (
                                                        <Switch
                                                            checked={event.isBlocked || false}
                                                            onCheckedChange={(checked) => handleBlockToggle(event.id, checked)}
                                                            className="data-[state=checked]:bg-red-600"
                                                        />
                                                    )}
                                                    {event.isBlocked && <ShieldAlert className="h-4 w-4 text-red-600" />}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        
                                        {/* EXPANDED DETAILS */}
                                        {isExpanded && (
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableCell colSpan={9} className="p-0">
                                                    <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        
                                                        <div className="space-y-1">
                                                            <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                                                <Calendar className="h-3 w-3" /> Fecha y Hora
                                                            </h4>
                                                            <p className="text-sm font-medium">
                                                                {eventDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                                                <MapPin className="h-3 w-3" /> Ubicación
                                                            </h4>
                                                            <p className="text-sm font-medium">{event.country}, {event.state}</p>
                                                            {event.googleMapsUrl && (
                                                                <Link href={event.googleMapsUrl} target="_blank" className="text-xs text-blue-600 hover:underline">
                                                                    Ver mapa
                                                                </Link>
                                                            )}
                                                        </div>

                                                        <div className="space-y-1">
                                                            <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                                                <Users className="h-3 w-3" /> Registro
                                                            </h4>
                                                            <p className="text-sm font-medium">
                                                                {event.currentParticipants || 0} / {event.maxParticipants || "Ilimitado"} Registrados
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Organizado por: {event.organizerName || event.ongName}
                                                            </p>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                                                <DollarSign className="h-3 w-3" /> Financiero Evento
                                                            </h4>
                                                            <div className="text-sm space-y-1">
                                                                <div className="flex justify-between"><span className="text-muted-foreground">Plataforma:</span> <span>{formatCurrency(event.platformCollected)}</span></div>
                                                                <div className="flex justify-between"><span className="text-muted-foreground">Efectivo:</span> <span>{formatCurrency(event.manualCollected)}</span></div>
                                                                <div className="flex justify-between font-bold border-t pt-1 mt-1"><span className="text-foreground">Total:</span> <span>{formatCurrency(event.totalCollected)}</span></div>
                                                                <div className="flex justify-between text-green-600"><span className="">Dispersado:</span> <span>{formatCurrency(event.amountDispersed)}</span></div>
                                                                <div className="flex justify-between">
                                                                    <span className={cn(isNegativeBalance ? "text-red-600" : "text-orange-600")}>Pendiente:</span> 
                                                                    <span className={cn("font-bold", isNegativeBalance ? "text-red-600" : "text-orange-600")}>{formatCurrency(event.pendingDisbursement)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* BiciRegistro Revenue Breakdown */}
                                                        {!isFree && revenue && (
                                                            <div className="space-y-1 bg-white dark:bg-black/20 p-2 rounded border">
                                                                <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                                                    <TrendingUp className="h-3 w-3" /> Ingresos BR
                                                                </h4>
                                                                <div className="flex flex-col gap-1 text-xs">
                                                                    <div className="flex justify-between text-muted-foreground">
                                                                        <span>Comisiones:</span>
                                                                        <span>{formatCurrency(grossRevenue)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-red-500/80">
                                                                        <span>- Pasarela:</span>
                                                                        <span>-{formatCurrency(revenue.mpCost)}</span>
                                                                    </div>
                                                                    <div className="border-t my-1"></div>
                                                                    <div className="flex justify-between font-bold text-green-700">
                                                                        <span>Utilidad:</span>
                                                                        <span>{formatCurrency(netRevenue)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                                                        <span>Base: {formatCurrency(revenue.net)}</span>
                                                                        <span>IVA: {formatCurrency(revenue.iva)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="col-span-full pt-4 border-t flex justify-end gap-2">
                                                             {!isFree && (
                                                                <Button 
                                                                    onClick={() => openPayoutModal(event)}
                                                                    size="sm"
                                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                                >
                                                                    <Wallet className="mr-2 h-4 w-4" /> Gestionar Dispersiones
                                                                </Button>
                                                             )}

                                                            <Button variant="outline" size="sm" asChild>
                                                                <Link href={`/events/${event.id}`} target="_blank">
                                                                    <ExternalLink className="mr-2 h-4 w-4" /> Ver Página del Evento
                                                                </Link>
                                                            </Button>
                                                            <Button variant="secondary" size="sm" asChild>
                                                                <Link href={`/dashboard/ong/events/${event.id}`} target="_blank">
                                                                    Ver Panel de Gestión
                                                                </Link>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                );
                            })}
                            
                            {sortedEvents.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center">
                                        No hay eventos registrados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    <PayoutManagerModal 
                        event={selectedEventForPayout}
                        isOpen={isPayoutModalOpen}
                        onClose={() => setIsPayoutModalOpen(false)}
                        onSuccess={() => {
                            router.refresh();
                        }}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
