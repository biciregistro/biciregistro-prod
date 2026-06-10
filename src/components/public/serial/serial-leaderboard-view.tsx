'use client';

import { useState } from 'react';
import { Trophy, Medal, Search, Clock, Award } from 'lucide-react';
import type { SerialLeaderboard, SerialLeaderboardRow } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SerialLeaderboardViewProps {
    leaderboards: SerialLeaderboard[];
    categories: { id: string, name: string }[];
}

export function SerialLeaderboardView({ leaderboards, categories }: SerialLeaderboardViewProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]?.id || '');
    const [searchTerm, setSearchTerm] = useState('');

    const activeLeaderboard = leaderboards.find(l => l.categoryId === selectedCategory);
    
    let displayRows = activeLeaderboard?.rows || [];
    if (searchTerm) {
        displayRows = displayRows.filter(r => 
            r.userName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    const formatTime = (ms?: number) => {
        if (!ms) return '-';
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
             return `${hours}h ${minutes}m ${seconds}s`;
        }
        return `${minutes}m ${seconds}s`;
    };

    if (categories.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-gray-50">
                <p className="font-medium text-gray-500 mb-2">Este campeonato no tiene categorías configuradas.</p>
            </div>
        );
    }

    if (leaderboards.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-gray-50">
                <Trophy className="w-12 h-12 text-gray-300 mb-4" />
                <p className="font-medium text-gray-500 mb-2">Resultados en proceso de publicación...</p>
                <p className="text-xs text-gray-400">Las tablas de posiciones se generarán automáticamente al procesar las carreras.</p>
             </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
                <div className="w-full sm:w-1/3">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="relative w-full sm:w-1/2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar corredor..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <Card className="overflow-hidden border shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[100px] text-center font-bold">Posición</TableHead>
                                <TableHead className="font-bold">Corredor</TableHead>
                                <TableHead className="text-center font-bold">Etapas</TableHead>
                                <TableHead className="text-right font-bold pr-6">Puntos</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayRows.length > 0 ? (
                                displayRows.map((row) => (
                                    <TableRow key={row.userId} className="hover:bg-slate-50/50">
                                        <TableCell className="text-center">
                                            {row.overallPosition === 1 && <Medal className="w-6 h-6 text-yellow-500 mx-auto" />}
                                            {row.overallPosition === 2 && <Medal className="w-6 h-6 text-gray-400 mx-auto" />}
                                            {row.overallPosition === 3 && <Medal className="w-6 h-6 text-amber-700 mx-auto" />}
                                            {row.overallPosition > 3 && <span className="font-bold text-gray-500">{row.overallPosition}º</span>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-semibold">{row.userName}</div>
                                            {(row.totalChipTimeMs || row.lastStagePosition) ? (
                                                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                                                    {row.lastStagePosition && <span>Última Fecha: {row.lastStagePosition}º</span>}
                                                    {row.totalChipTimeMs && <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {formatTime(row.totalChipTimeMs)}</span>}
                                                </div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="bg-slate-100">{row.stagesCompleted}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <span className="inline-flex items-center gap-1.5 font-bold text-lg text-orange-600">
                                                {row.totalPoints} <span className="text-xs text-orange-400 font-normal">pts</span>
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                        No hay resultados para mostrar en esta categoría.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {activeLeaderboard && activeLeaderboard.lastCalculatedAt && (
                    <div className="bg-slate-50 px-4 py-2 text-xs text-muted-foreground border-t flex justify-end items-center gap-2">
                        <Award className="w-3 h-3" />
                        Última actualización: {new Date(activeLeaderboard.lastCalculatedAt).toLocaleString('es-MX')}
                    </div>
                )}
            </Card>
        </div>
    );
}
