'use client';

import { ChartDataItem } from '@/lib/types';
import { Trophy, Users } from 'lucide-react';

interface TopListIndicatorProps {
    title: string;
    data: ChartDataItem[];
    onItemClick: (item: ChartDataItem, title: string) => void;
}

export function TopListIndicator({ title, data, onItemClick }: TopListIndicatorProps) {
    if (!data || data.length === 0) return <div className="text-center text-sm text-muted-foreground p-4 h-64 flex items-center justify-center">Sin datos</div>;
    
    return (
        <div className="h-64 w-full px-1">
             <p className="text-sm font-medium text-center mb-4">{title}</p>
             <div className="space-y-2">
                {data.slice(0, 5).map((item, index) => (
                    <div 
                        key={index} 
                        className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                        onClick={() => item.detailedData && item.detailedData.length > 0 && onItemClick(item, title)}
                        style={{ cursor: item.detailedData && item.detailedData.length > 0 ? 'pointer' : 'default' }}
                    >
                        <div className='flex items-center gap-2 min-w-0'>
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex-shrink-0">
                            {index === 0 && <Trophy className="h-3 w-3 text-amber-500" />}
                            {index > 0 && (index + 1)}
                          </div>
                          <span className="font-medium text-xs truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="font-semibold text-xs text-slate-600">{item.value.toLocaleString()}</span>
                        </div>
                    </div>
                ))}
             </div>
        </div>
    );
}
