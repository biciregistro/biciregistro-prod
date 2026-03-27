'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Capa 1: Escudo SSR. Al importar usando next/dynamic con ssr: false,
// garantizamos que el servidor de Next.js jamás evaluará ni intentará
// renderizar "security-map.tsx" (ni su import de 'leaflet' en el top-level).
const SecurityMap = dynamic(() => import('./security-map'), { 
    ssr: false, 
    loading: () => <Skeleton className="h-[500px] w-full col-span-full rounded-md border" /> 
});

export function SecurityMapWrapper({ data }: { data: any }) {
    return <SecurityMap data={data} />;
}
