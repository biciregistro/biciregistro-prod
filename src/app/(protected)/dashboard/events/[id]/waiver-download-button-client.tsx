'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import dynamic from 'next/dynamic';

const WaiverDownloadModal = dynamic(() => import('@/components/ong/waiver-download-modal').then(mod => mod.WaiverDownloadModal), {
    ssr: false,
});

export function WaiverDownloadButton({ registrationId, eventName, participantName }: { registrationId: string, eventName: string, participantName: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button variant="outline" className="w-full" onClick={() => setIsOpen(true)}>
                <Download className="mr-2 h-4 w-4" />
                Descargar Documento PDF
            </Button>

            <WaiverDownloadModal 
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                registrationId={registrationId}
                eventName={eventName}
                participantName={participantName}
            />
        </>
    );
}
