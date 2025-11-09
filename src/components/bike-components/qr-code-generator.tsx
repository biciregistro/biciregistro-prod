'use client';

import { useRef, useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface QRCodeGeneratorProps {
  serialNumber: string;
}

const QRCodeGenerator = ({ serialNumber }: QRCodeGeneratorProps) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState('');

  useEffect(() => {
    // This code runs only on the client, after the component has mounted.
    // So, 'window' is guaranteed to be available here.
    setUrl(`${window.location.origin}/bikes/${serialNumber}`);
  }, [serialNumber]);

  const downloadQRCode = () => {
    if (qrRef.current) {
      const canvas = qrRef.current.querySelector('canvas');
      if (canvas) {
        const image = canvas.toDataURL('image/jpeg', 1.0);
        const a = document.createElement('a');
        a.href = image;
        a.download = `qr-bike-${serialNumber}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={qrRef}>
        {url ? (
          <QRCodeCanvas
            value={url}
            size={256}
            bgColor={"#ffffff"}
            fgColor={"#000000"}
            level={"H"}
            includeMargin={true}
          />
        ) : (
          // Show a placeholder or skeleton while the URL is being generated on the client
          <Skeleton className="h-[256px] w-[256px]" />
        )}
      </div>
      <Button onClick={downloadQRCode} disabled={!url}>
        Descargar Código QR
      </Button>
    </div>
  );
};

export default QRCodeGenerator;
