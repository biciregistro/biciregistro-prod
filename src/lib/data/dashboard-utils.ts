import { Suspense } from 'react';
import { getSerialsByOngId } from '@/lib/data/serial-data';

// Helper function to partition events and serials
export async function getPartitionedDashboardData(ongId: string, flatEvents: any[]) {
    // 1. Fetch Serials
    const serials = await getSerialsByOngId(ongId);
    
    // 2. Map serials for quick lookup
    const serialsMap = new Map(serials.map(s => [s.id, s]));
    
    // 3. Partition events
    const independentEvents: any[] = [];
    const serialStagesMap = new Map<string, any[]>(); // serialId -> events[]
    
    flatEvents.forEach(event => {
        if (event.serialId && serialsMap.has(event.serialId)) {
            if (!serialStagesMap.has(event.serialId)) {
                serialStagesMap.set(event.serialId, []);
            }
            serialStagesMap.get(event.serialId)!.push(event);
        } else {
            independentEvents.push(event);
        }
    });

    return {
        serials,
        independentEvents,
        serialStagesMap
    };
}
