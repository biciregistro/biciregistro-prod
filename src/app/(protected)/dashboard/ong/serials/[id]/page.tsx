import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthenticatedUser } from '@/lib/data';
import { getSerial } from '@/lib/data/serial-data';
import { convertEventTimestamps } from '@/lib/data/core'; // Higienizador de Firebase Timestamps
import { adminDb as db } from '@/lib/firebase/server';
import { SerialManagement } from '@/components/ong/serial-management/serial-management';
import { ArrowLeft } from 'lucide-react';
import type { Event } from '@/lib/types';

export default async function SerialDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await getAuthenticatedUser();

    if (!user) redirect('/login');
    if (user.role !== 'ong' && user.role !== 'admin') redirect('/dashboard');

    // 1. Fetch Serial
    const serial = await getSerial(id);
    if (!serial) notFound();

    // Ensure authorization
    if (user.role === 'ong' && serial.ongId !== user.id) {
        redirect('/dashboard/ong');
    }

    // 2. Fetch Stages directly for this serial (ordered by stageOrder)
    const stagesSnapshot = await db.collection('events')
        .where('serialId', '==', id)
        .orderBy('stageOrder', 'asc')
        .get();
        
    // RCA Fix: Higienización estricta de la clase Timestamp nativa a objetos planos para pasar a un Client Component
    const stages = stagesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...convertEventTimestamps(doc.data()) 
    })) as Event[];

    // 3. Fetch Serial Competitors (The optimized denormalized view)
    const competitorsSnapshot = await db.collection('serial_competitors')
        .where('serialId', '==', id)
        .get();
        
    const competitors = competitorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const backLink = user.role === 'admin' ? '/admin' : '/dashboard/ong?tab=events';

    return (
        <div className="container py-8 px-4 md:px-6 space-y-6">
            <Link href={backLink} className="text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2 text-sm w-fit">
                <ArrowLeft className="h-4 w-4" /> Volver a Mis Eventos
            </Link>
            
            <SerialManagement 
                serial={serial}
                stages={stages}
                competitors={competitors}
            />
        </div>
    );
}
