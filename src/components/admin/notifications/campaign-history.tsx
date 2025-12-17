import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Campaign {
    id: string;
    title: string;
    body: string;
    sentAt: string;
    successCount: number;
    recipientCount: number;
}

interface CampaignHistoryProps {
    campaigns: Campaign[];
}

export function CampaignHistory({ campaigns }: CampaignHistoryProps) {
    if (!campaigns || campaigns.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400 text-sm">
                No hay historial de campañas recientes.
            </div>
        );
    }

    return (
        <ScrollArea className="h-[300px] w-full pr-4">
            <div className="space-y-4">
                {campaigns.map((camp) => (
                    <Card key={camp.id} className="border shadow-none bg-slate-50/50">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">{camp.title}</h4>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                    {format(new Date(camp.sentAt), "d MMM, HH:mm", { locale: es })}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2 mb-3">{camp.body}</p>
                            <div className="flex items-center gap-2 text-xs">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    {camp.successCount} enviados
                                </Badge>
                                <span className="text-slate-400">
                                    de {camp.recipientCount} destinatarios
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    );
}
