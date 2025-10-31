import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getBikeBySerial } from '@/lib/data';
import { BikeSearchForm } from '@/components/homepage-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Bike } from '@/lib/types';

const bikeStatusStyles: { [key in Bike['status']]: string } = {
  safe: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
  stolen: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
  in_transfer: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700',
};

export default async function SearchPage({ searchParams }: { searchParams?: { serial?: string } }) {
  const serial = searchParams?.serial;
  let bike: Bike | undefined;

  if (serial) {
    bike = await getBikeBySerial(serial);
  }
  
  return (
    <div className="container py-8">
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
                    <CardContent className="flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-1/3">
                            <div className="relative aspect-video rounded-lg overflow-hidden border">
                                <Image 
                                    src={bike.photos[0] || ''}
                                    alt={`${bike.make} ${bike.model}`}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </div>
                        <div className="flex-1 space-y-3">
                            <h2 className="text-2xl font-bold">{bike.make} {bike.model}</h2>
                             <div>
                                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                                <Badge className={cn(bikeStatusStyles[bike.status], "text-base")}>
                                    {bike.status === 'safe' ? 'En Regla' : bike.status === 'stolen' ? 'Robada' : 'En transferencia'}
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
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}
