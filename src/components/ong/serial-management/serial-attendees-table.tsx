'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle2, XCircle, Minus, ShieldAlert } from 'lucide-react';
import type { Event } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SerialAttendeesTableProps {
    competitors: any[]; // Replace with proper SerialCompetitor[] later
    stages: Event[];
}

export function SerialAttendeesTable({ competitors, stages }: SerialAttendeesTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    
    // Sort stages chronologically to display as columns correctly
    const sortedStages = [...stages].sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));

    const filteredCompetitors = useMemo(() => {
        if (!searchTerm) return competitors;
        const lowerSearch = searchTerm.toLowerCase();
        
        return competitors.filter(comp => 
            comp.userName?.toLowerCase().includes(lowerSearch) ||
            comp.userEmail?.toLowerCase().includes(lowerSearch) ||
            comp.bibNumber?.toString().includes(lowerSearch)
        );
    }, [competitors, searchTerm]);

    const renderStageBadge = (competitor: any, stageId: string) => {
        const stageData = competitor.stages?.[stageId];
        
        if (!stageData || !stageData.isRegistered) {
            return (
                <div className="flex justify-center" title="No inscrito">
                    <Minus className="h-4 w-4 text-muted-foreground/30" />
                </div>
            );
        }

        if (stageData.paymentStatus === 'cancelled') {
             return (
                <div className="flex justify-center" title="Cancelado">
                    <XCircle className="h-4 w-4 text-red-400" />
                </div>
            );
        }
        
        if (stageData.paymentStatus === 'pending') {
             return (
                <div className="flex justify-center" title="Pago Pendiente">
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                </div>
            );
        }

        // isRegistered and (paid or not_applicable)
        return (
            <div className="flex justify-center" title="Inscrito">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
        );
    };

    const renderWaiverStatus = (competitor: any) => {
        if (!competitor.stages || Object.keys(competitor.stages).length === 0) return null;

        // Check if there's any active stage where waiver is NOT signed
        const hasMissingWaiver = Object.values(competitor.stages).some(
            (stage: any) => stage.isRegistered && stage.paymentStatus !== 'cancelled' && !stage.waiverSigned
        );

        if (hasMissingWaiver) {
            return (
                <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 text-[10px] py-0 gap-1" title="Falta responsiva en 1 o más etapas activas">
                    <ShieldAlert className="w-3 h-3" /> Pendiente
                </Badge>
            );
        }

        return (
             <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-[10px] py-0" title="Responsivas al día">
                Firmado
            </Badge>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="relative flex-1 md:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar corredor, placa, email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="text-sm text-muted-foreground font-medium">
                    {filteredCompetitors.length} corredores
                </div>
            </div>

            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/50 whitespace-nowrap">
                        <TableRow>
                            <TableHead className="w-[80px]">Placa</TableHead>
                            <TableHead className="min-w-[200px]">Corredor</TableHead>
                            <TableHead>Categoría</TableHead>
                            {/* Dynamic Stage Columns */}
                            {sortedStages.map((stage, i) => (
                                <TableHead key={stage.id} className="text-center text-xs px-2" title={stage.name}>
                                    E{i + 1}
                                </TableHead>
                            ))}
                            <TableHead className="text-center">Lealtad</TableHead>
                            <TableHead className="text-center">Responsiva</TableHead>
                            <TableHead className="text-center">Puntos</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCompetitors.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6 + sortedStages.length} className="h-24 text-center text-muted-foreground">
                                    No se encontraron corredores.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCompetitors.map((comp) => {
                                const registeredStagesCount = Object.values(comp.stages || {}).filter(
                                    (s: any) => s.isRegistered && s.paymentStatus !== 'cancelled'
                                ).length;
                                
                                const loyaltyPercentage = stages.length > 0 
                                    ? Math.round((registeredStagesCount / stages.length) * 100) 
                                    : 0;

                                return (
                                    <TableRow key={comp.id} className="whitespace-nowrap">
                                        <TableCell className="font-mono font-bold text-base">
                                            {comp.bibNumber || <span className="text-xs text-muted-foreground font-sans">Pendiente</span>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{comp.userName}</span>
                                                <span className="text-xs text-muted-foreground">{comp.userEmail}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-normal text-xs">
                                                {comp.categoryName || 'General'}
                                            </Badge>
                                        </TableCell>
                                        
                                        {/* Dynamic Stage Cells */}
                                        {sortedStages.map((stage) => (
                                            <TableCell key={stage.id} className="px-2">
                                                {renderStageBadge(comp, stage.id)}
                                            </TableCell>
                                        ))}

                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-bold">{registeredStagesCount}/{stages.length}</span>
                                                <div className="w-12 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                                                    <div 
                                                        className={cn("h-full", loyaltyPercentage === 100 ? "bg-green-500" : "bg-primary")} 
                                                        style={{ width: `${loyaltyPercentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center">
                                            {renderWaiverStatus(comp)}
                                        </TableCell>

                                        <TableCell className="text-center font-bold">
                                            {comp.totalPoints || 0}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
