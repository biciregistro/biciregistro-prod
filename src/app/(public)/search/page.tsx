import Image from 'next/image';
import { getBikeBySerial, getUser } from '@/lib/data';
import { BikeSearchForm } from '@/components/homepage-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import type { Bike } from '@/lib/types';
import { Globe } from 'lucide-react';

const bikeStatusStyles: { [key in Bike['status']]: string } = {
  safe: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
  stolen: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
  in_transfer: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700',
  recovered: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700',
};

// Helper function for exact match
function isExactMatch(biSerial: string | null | undefined, ourSerial: string): boolean {
    if (!biSerial) return false;
    const cleanBi = biSerial.replace(/[\s-]+/g, '').toUpperCase();
    const cleanOur = ourSerial.replace(/[\s-]+/g, '').toUpperCase();
    return cleanBi === cleanOur;
}

// Función para obtener la bici de Bike Index si no existe localmente
async function getBikeFromBikeIndex(serial: string): Promise<(Bike & { isExternal?: boolean, externalUrl?: string, externalSource?: string }) | null> {
    try {
        const cleanSerialForBi = serial.replace(/[\s-]+/g, '').toUpperCase();
        const biRes = await fetch(`https://bikeindex.org/api/v3/search?serial=${encodeURIComponent(cleanSerialForBi)}&stolenness=stolen`, { next: { revalidate: 60 } });
        
        if (biRes.ok) {
            const biData = await biRes.json();
            if (biData.bikes && biData.bikes.length > 0) {
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
                        photos: stolenBike.large_img ? [stolenBike.large_img] : (stolenBike.thumb ? [stolenBike.thumb] : []),
                        status: 'stolen',
                        createdAt: new Date().toISOString(),
                        isExternal: true,
                        externalSource: 'Bike Index',
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
        console.error("Error fetching from Bike Index in SearchPage:", error);
    }
    return null;
}


export default async function SearchPage({ searchParams }: { searchParams: Promise<{ serial?: string } | undefined> }) {
  // Await searchParams before accessing properties
  const params = await searchParams;
  const serial = params?.serial;
  
  let bike: (Bike & { isExternal?: boolean, externalUrl?: string, externalSource?: string }) | null | undefined;
  let owner: Awaited<ReturnType<typeof getUser>> | undefined;

  if (serial) {
    // 1. Buscamos localmente primero
    bike = await getBikeBySerial(serial);
    
    // 2. Si no existe localmente, buscamos en Bike Index
    if (!bike) {
        bike = await getBikeFromBikeIndex(serial);
    }

    // 3. Si existe localmente, buscamos su dueño
    if (bike && !bike.isExternal && bike.userId) {
      owner = await getUser(bike.userId);
    }
  }
  
  return (
    <div className="container py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-center mb-4">Búsqueda Pública de Bicicletas</h1>
        <p className="text-muted-foreground text-center mb-8">
            Verifica el estado de una bicicleta antes de comprar. Ingresa un número de serie para consultar nuestra base de datos pública.
        </p>
        <BikeSearchForm />

        <div className="mt-12">
            {serial && !bike && (
                 <Card>
                    <CardContent className="p-8 text-center bg-green-50/50 border-green-100">
                        <div className="mx-auto bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <p className="text-lg font-medium text-green-900">Sin reportes de robo</p>
                        <p className="text-sm text-green-700 mt-2">No se encontró ninguna bicicleta con el número de serie: <strong>{serial}</strong> en nuestra base de datos ni en redes globales.</p>
                    </CardContent>
                </Card>
            )}
            {bike && (
                <Card className={cn(bike.status === 'stolen' && "border-red-200 shadow-red-100 shadow-lg")}>
                    <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                        <CardTitle>Resultado de la Búsqueda</CardTitle>
                        {bike.isExternal && (
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="flex items-center gap-1.5 bg-blue-50 text-blue-800 border-blue-200">
                                    <Globe className="w-3.5 h-3.5" />
                                    Red Global
                                </Badge>
                                <div className="h-5 opacity-80">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img 
                                        src="https://bikeindex.org/assets/resources/logo_backgrounded_black-f42a6565a502cb609020b10d7ffbbefadca7bfc993bcf526f8c57730a99a713e.svg" 
                                        alt="Bike Index Logo" 
                                        className="h-full w-auto object-contain"
                                    />
                                </div>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {bike.photos && bike.photos.length > 0 && (
                            <div className="relative">
                                <Carousel className="w-full">
                                    <CarouselContent>
                                        {bike.photos.map((photo, index) => (
                                            <CarouselItem key={index}>
                                                <div className="relative aspect-video rounded-lg overflow-hidden border bg-gray-50 flex items-center justify-center">
                                                    <Image 
                                                        src={photo}
                                                        alt={`Foto ${index + 1} de ${bike?.make} ${bike?.model}`}
                                                        fill
                                                        className="object-contain"
                                                    />
                                                </div>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    {bike.photos.length > 1 && (
                                        <>
                                            <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10" />
                                            <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10" />
                                        </>
                                    )}
                                </Carousel>
                            </div>
                        )}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold">{bike.make} {bike.model}</h2>
                             <div>
                                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                                <Badge className={cn(bikeStatusStyles[bike.status], "text-base mt-1")}>
                                    {bike.status === 'safe' ? 'En Regla' : 
                                     bike.status === 'stolen' ? 'Robada' : 
                                     bike.status === 'recovered' ? 'Recuperada' :
                                     'En transferencia'}
                                </Badge>
                             </div>
                             {bike.status === 'stolen' && (
                                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                    <p className="text-sm font-bold text-red-800 uppercase">🚨 Alerta de Seguridad</p>
                                    <p className="text-sm text-red-700 mt-1">
                                        {bike.isExternal 
                                            ? `Esta bicicleta ha sido reportada como robada en la red global de ${bike.externalSource}. No la compres.`
                                            : "Esta bicicleta ha sido reportada como robada en Biciregistro. No la compres. Si tienes información, por favor contacta a las autoridades locales."}
                                    </p>
                                    {bike.theftReport?.location && (
                                        <p className="text-xs text-red-600 mt-2 font-medium">Última ubicación conocida: {bike.theftReport.location}</p>
                                    )}
                                    {bike.isExternal && bike.externalUrl && (
                                        <a href={bike.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs font-bold text-red-800 underline">
                                            Ver reporte original en {bike.externalSource}
                                        </a>
                                    )}
                                </div>
                             )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Número de Serie</p>
                                    <p className="font-mono">{bike.serialNumber}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Color</p>
                                    <p>{bike.color}</p>
                                </div>
                            </div>
                            {owner && !bike.isExternal && (
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Propietario Actual</p>
                                        <p>{owner.name} {owner.lastName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Ubicación de Registro</p>
                                        <p>{owner.state && `${owner.state}, `}{owner.country}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}
