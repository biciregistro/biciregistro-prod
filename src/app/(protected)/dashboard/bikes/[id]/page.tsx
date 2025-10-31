import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getAuthenticatedUser, getBikeById } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { TheftReportForm } from '@/components/bike-components';
import { cn } from '@/lib/utils';
import type { Bike } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const bikeStatusStyles: { [key in Bike['status']]: string } = {
  safe: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
  stolen: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
  in_transfer: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700',
};

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
        </div>
    );
}

export default async function BikeDetailsPage({ params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }
  
  const bike = await getBikeById(params.id);

  if (!bike || bike.userId !== user.id) {
    notFound();
  }

  return (
    <div className="container py-6 md:py-8">
      <div className="mb-6 px-4 sm:px-0">
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Garaje
          </Link>
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto px-4 sm:px-0">
        <div>
          <Carousel className="w-full">
            <CarouselContent>
              {bike.photos.length > 0 ? bike.photos.map((photo, index) => (
                <CarouselItem key={index}>
                  <div className="aspect-video relative rounded-lg overflow-hidden border">
                    <Image src={photo} alt={`Foto de la bicicleta ${index + 1}`} fill className="object-cover" />
                  </div>
                </CarouselItem>
              )) : (
                <CarouselItem>
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">No hay fotos disponibles</p>
                    </div>
                </CarouselItem>
              )}
            </CarouselContent>
            {bike.photos.length > 1 && <>
                <CarouselPrevious className="ml-12 sm:ml-16" />
                <CarouselNext className="mr-12 sm:mr-16" />
            </>}
          </Carousel>
        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">{bike.make} {bike.model}</CardTitle>
                    <CardDescription>
                        <Badge className={cn(bikeStatusStyles[bike.status], "text-base mt-2")}>
                            Estado: {bike.status === 'safe' ? 'A salvo' : bike.status === 'stolen' ? 'Robada' : 'En transferencia'}
                        </Badge>
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <DetailItem label="Número de Serie" value={<span className="font-mono">{bike.serialNumber}</span>} />
                    <DetailItem label="Color" value={bike.color} />
                    <DetailItem label="Marca" value={bike.make} />
                    <DetailItem label="Modelo" value={bike.model} />
                </CardContent>
            </Card>

            {bike.status === 'stolen' && bike.theftReport && (
                 <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle className="text-destructive">Detalles del Reporte de Robo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <DetailItem label="Fecha del Reporte" value={new Date(bike.theftReport.date).toLocaleDateString()} />
                        <DetailItem label="Última Ubicación Conocida" value={bike.theftReport.location} />
                        <DetailItem label="Detalles" value={bike.theftReport.details} />
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Gestionar Estado de la Bicicleta</CardTitle>
                </CardHeader>
                <CardContent>
                    <TheftReportForm bike={bike} />
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
