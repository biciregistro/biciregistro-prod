import Image from 'next/image';
import { getBikeBySerial, getUser } from '@/lib/data';
import { BikeSearchForm } from '@/components/homepage-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import type { Bike } from '@/lib/types';

const bikeStatusStyles: { [key in Bike['status']]: string } = {
  safe: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
  stolen: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
  in_transfer: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700',
  recovered: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700',
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ serial?: string } | undefined> }) {
  // Await searchParams before accessing properties
  const params = await searchParams;
  const serial = params?.serial;
  
  // Fix: Allow null as valid type because getBikeBySerial returns Bike | null
  let bike: Bike | null | undefined;
  let owner: Awaited<ReturnType<typeof getUser>> | undefined;

  if (serial) {
    bike = await getBikeBySerial(serial);
    if (bike) {
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
                    <CardContent className="p-8 text-center">
                        <p>No se encontró ninguna bicicleta con el número de serie: <strong>{serial}</strong></p>
                    </CardContent>
                </Card>
            )}
            {bike && (
                <Card>
                    <CardHeader>
                        <CardTitle>Resultado de la Búsqueda</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {bike.photos && bike.photos.length > 0 && (
                            <div className="relative">
                                <Carousel className="w-full">
                                    <CarouselContent>
                                        {bike.photos.map((photo, index) => (
                                            <CarouselItem key={index}>
                                                <div className="relative aspect-video rounded-lg overflow-hidden border">
                                                    <Image 
                                                        src={photo}
                                                        alt={`Foto ${index + 1} de ${bike.make} ${bike.model}`}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10" />
                                    <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10" />
                                </Carousel>
                            </div>
                        )}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold">{bike.make} {bike.model}</h2>
                             <div>
                                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                                <Badge className={cn(bikeStatusStyles[bike.status], "text-base")}>
                                    {bike.status === 'safe' ? 'En Regla' : 
                                     bike.status === 'stolen' ? 'Robada' : 
                                     bike.status === 'recovered' ? 'Recuperada' :
                                     'En transferencia'}
                                </Badge>
                             </div>
                             {bike.status === 'stolen' && (
                                <p className="text-sm text-destructive">Esta bicicleta ha sido reportada como robada. No la compres. Si tienes información, por favor contacta a las autoridades locales.</p>
                             )}
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Número de Serie</p>
                                <p className="font-mono">{bike.serialNumber}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Color</p>
                                <p>{bike.color}</p>
                            </div>
                            {owner && (
                                <>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Propietario Actual</p>
                                        <p>{owner.name} {owner.lastName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Ubicación de Registro</p>
                                        <p>{owner.state && `${owner.state}, `}{owner.country}</p>
                                    </div>
                                </>
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
