'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

export function RegistrationQRCode({ registrationId }: { registrationId: string }) {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');

    useEffect(() => {
        if (typeof window !== 'undefined' && registrationId) {
            // Future URL for check-in
            const url = `${window.location.origin}/admin/checkin/${registrationId}`;
            
            QRCode.toDataURL(url, {
                width: 200,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#ffffff',
                },
            })
            .then(setQrDataUrl)
            .catch(err => console.error("Error generating QR:", err));
        }
    }, [registrationId]);

    if (!qrDataUrl) {
        return <Skeleton className="h-[180px] w-[180px] rounded-lg" />;
    }

    return (
        <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg">
            <div className="relative w-[180px] h-[180px]">
                <Image 
                    src={qrDataUrl} 
                    alt={`QR para registro ${registrationId}`}
                    fill
                    className="object-contain"
                />
            </div>
            <p className="mt-2 text-[9px] font-mono text-muted-foreground uppercase tracking-widest text-center">
                Registro ID: {registrationId.substring(0, 8)}...
            </p>
        </div>
    );
}
