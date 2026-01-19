import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getBikeBySerial } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Bike, BikeStatus } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { Metadata } from 'next';

// This function generates dynamic metadata for each bike page
export async function generateMetadata({ params }: { params: Promise<{ serial: string }> }): Promise<Metadata> {
  const { serial } = await params;
  const bike = await getBikeBySerial(serial);

  if (!bike) {
    return {
      title: 'Bicicleta no encontrada | BiciRegistro',
      description: 'No se encontró una bicicleta con este número de serie en nuestra base de datos.',
    };
  }

  const isStolen = bike.status === 'stolen';
  const statusText = isStolen ? 'Reportada como ROBADA' : 'Marcada como Segura';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
  
  // Construir URL para la imagen dinámica OG
  const ogSearchParams = new URLSearchParams({
    brand: bike.make,
    model: bike.model || '',
    status: bike.status,
    image: bike.photos[0] || '',
  });
  
  if (isStolen && bike.theftReport) {
    if (bike.theftReport.reward) {
        ogSearchParams.append('reward', bike.theftReport.reward.toString());
    }
    if (bike.theftReport.location) {
        ogSearchParams.append('location', bike.theftReport.location);
    }
  }

  const ogImageUrl = `${baseUrl}/api/og/bike?${ogSearchParams.toString()}`;
  const title = `Bicicleta ${bike.make} ${bike.model} - Serie: ${bike.serialNumber} | BiciRegistro`;
  const description = isStolen 
    ? `🚨 ¡ALERTA! Bicicleta ${bike.make} ${bike.model} reportada como ROBADA. Serie: ${bike.serialNumber}. Ayúdanos a localizarla.`
    : `Verifica el estado de la bicicleta ${bike.make} ${bike.model} con número de serie ${bike.serialNumber}. Estado actual: ${statusText}.`;

  return {
    title: title,
    description: description,
    keywords: ['bicicleta', 'registro', 'robo', 'verificar', 'seguridad', bike.make, bike.model, bike.serialNumber],
    openGraph: {
        title: isStolen ? `🚨 ¡ROBADA! ${bike.make} ${bike.model}` : title,
        description: description,
        images: [{
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `Bicicleta ${bike.make} ${bike.model}`,
        }],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: isStolen ? `🚨 ¡ROBADA! ${bike.make} ${bike.model}` : title,
        description: description,
        images: [ogImageUrl],
    }
  };
}


const bikeStatusStyles: { [key in BikeStatus]: string } = {
    safe: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
    stolen: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
    in_transfer: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700',
    recovered: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700',
};

export default async function PublicBikePage({ params }: { params: Promise<{ serial: string }> }) {
  // Await params before accessing properties
  const { serial } = await params;
  const bike = await getBikeBySerial(serial);

  if (!bike) {
    notFound();
  }

  return (
    <div className="container py-8">
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">Registro Público de Bicicleta</h1>
            <Card>
                <CardContent className="grid md:grid-cols-2 gap-8 p-6">
                    <div className="relative aspect-video rounded-lg overflow-hidden border">
                        <Image 
                            src={bike.photos[0] || ''}
                            alt={`${bike.make} ${bike.model}`}
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-bold">{bike.make} {bike.model}</h2>
                            <p className="text-muted-foreground">{bike.color}</p>
                        </div>
                        
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Número de Serie</p>
                            <p className="font-mono text-lg">{bike.serialNumber}</p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-sm font-medium">Estado</p>
                            <Badge className={cn("text-base", bikeStatusStyles[bike.status])}>
                                {bike.status === 'safe' ? 'En Regla' : 
                                 bike.status === 'stolen' ? 'Robada' : 
                                 bike.status === 'recovered' ? 'Recuperada' :
                                 'En transferencia'}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {bike.status === 'stolen' && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>¡Esta bicicleta está reportada como robada!</AlertTitle>
                    <AlertDescription>
                        No intentes comprar esta bicicleta. Si tienes información sobre su paradero, por favor contacta a tu agencia de policía local.
                    </AlertDescription>
                </Alert>
            )}

            {(bike.status === 'safe' || bike.status === 'recovered') && (
                <Alert variant="default" className="bg-green-50 border-green-200">
                    <AlertCircle className="h-4 w-4 text-green-700" />
                    <AlertTitle className="text-green-800">Esta bicicleta está marcada como segura.</AlertTitle>
                    <AlertDescription className="text-green-700">
                        Actualmente, esta bicicleta no está reportada como robada en la base de datos de Biciregistro.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    </div>
  );
}
