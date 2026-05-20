import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getBikeBySerial } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Bike, BikeStatus } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Globe } from 'lucide-react';
import type { Metadata } from 'next';

// Helper for exact match comparison
function isExactMatch(biSerial: string | null | undefined, ourSerial: string): boolean {
    if (!biSerial) return false;
    const cleanBi = biSerial.replace(/[\s-]+/g, '').toUpperCase();
    const cleanOur = ourSerial.replace(/[\s-]+/g, '').toUpperCase();
    return cleanBi === cleanOur;
}

// Función para obtener la bici de Bike Index como mock
async function getBikeFromBikeIndex(serial: string): Promise<(Bike & { isExternal?: boolean, externalUrl?: string }) | null> {
    try {
        const cleanSerialForBi = serial.replace(/[\s-]+/g, '').toUpperCase();
        const biRes = await fetch(`https://bikeindex.org/api/v3/search?serial=${encodeURIComponent(cleanSerialForBi)}&stolenness=stolen`, { next: { revalidate: 60 } });
        
        if (biRes.ok) {
            const biData = await biRes.json();
            if (biData.bikes && biData.bikes.length > 0) {
                // Buscamos coincidencia exacta igual que en el API
                const stolenBike = biData.bikes.find((b: any) => 
                    b.stolen && isExactMatch(b.serial, cleanSerialForBi)
                );

                if (stolenBike) {
                    return {
                        id: `bi-${stolenBike.id}`,
                        userId: 'external',
                        make: stolenBike.manufacturer_name || 'Desconocida',
                        model: stolenBike.frame_model || 'Desconocido',
                        color: stolenBike.frame_colors?.join(', ') || 'Desconocido',
                        serialNumber: serial,
                        photos: stolenBike.large_img ? [stolenBike.large_img] : (stolenBike.thumb ? [stolenBike.thumb] : ['/logo.png']),
                        status: 'stolen',
                        createdAt: new Date().toISOString(),
                        isExternal: true,
                        externalUrl: stolenBike.url,
                        theftReport: {
                            date: stolenBike.date_stolen ? new Date(stolenBike.date_stolen * 1000).toISOString() : new Date().toISOString(),
                            location: stolenBike.stolen_location || 'Ubicación no especificada',
                            details: 'Bicicleta reportada como robada en la red global de Bike Index.',
                        }
                    };
                }
            }
        }
    } catch (error) {
        console.error("Error fetching from Bike Index:", error);
    }
    return null;
}

export async function generateMetadata({ params }: { params: Promise<{ serial: string }> }): Promise<Metadata> {
  const { serial } = await params;
  let bike = await getBikeBySerial(serial);
  
  if (!bike) {
      const biBike = await getBikeFromBikeIndex(serial);
      if (biBike) {
          bike = biBike as Bike;
      }
  }

  if (!bike) {
    return {
      title: 'Bicicleta no encontrada | BiciRegistro',
      description: 'No se encontró una bicicleta con este número de serie en nuestra base de datos.',
    };
  }

  const isStolen = bike.status === 'stolen';
  const statusText = isStolen ? 'Reportada como ROBADA' : 'Marcada como Segura';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';
  
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
  const { serial } = await params;
  let bike: (Bike & { isExternal?: boolean, externalUrl?: string }) | null = await getBikeBySerial(serial);

  if (!bike) {
      bike = await getBikeFromBikeIndex(serial);
  }

  if (!bike) {
    notFound();
  }

  return (
    <div className="container py-8">
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Registro Público de Bicicleta</h1>
                {bike.isExternal && (
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="flex items-center gap-1.5 bg-blue-50 text-blue-800 border-blue-200 shadow-sm py-1">
                            <Globe className="w-3.5 h-3.5" />
                            Red Global
                        </Badge>
                        <div className="h-6 opacity-70">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src="https://bikeindex.org/assets/resources/logo_backgrounded_black-f42a6565a502cb609020b10d7ffbbefadca7bfc993bcf526f8c57730a99a713e.svg" 
                                alt="Bike Index Logo" 
                                className="h-full w-auto object-contain"
                            />
                        </div>
                    </div>
                )}
            </div>
            <Card>
                <CardContent className="grid md:grid-cols-2 gap-8 p-6">
                    <div className="relative aspect-video rounded-lg overflow-hidden border bg-gray-50 flex items-center justify-center">
                        <Image 
                            src={bike.photos[0] || '/logo.png'}
                            alt={`${bike.make} ${bike.model}`}
                            fill
                            className="object-contain"
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

                        {bike.isExternal && bike.externalUrl && (
                            <div className="pt-2">
                                <a 
                                    href={bike.externalUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    Ver reporte original completo <Globe className="w-3 h-3" />
                                </a>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {bike.status === 'stolen' && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>¡Esta bicicleta está reportada como robada!</AlertTitle>
                    <AlertDescription>
                        {bike.isExternal 
                            ? "Este reporte proviene de la red global de Bike Index. No intentes comprar esta bicicleta." 
                            : "No intentes comprar esta bicicleta. Si tienes información sobre su paradero, por favor contacta a tu agencia de policía local."}
                        {bike.theftReport?.location && (
                            <div className="mt-2 text-sm font-medium">
                                Última ubicación conocida: {bike.theftReport.location}
                            </div>
                        )}
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
