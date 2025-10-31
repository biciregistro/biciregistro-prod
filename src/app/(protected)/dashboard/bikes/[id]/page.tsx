import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';
import { getAuthenticatedUser, getBikeById } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { TheftReportForm } from '@/components/bike-components';
import { cn } from '@/lib/utils';
import type { Bike } from '@/lib/types';

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
    <div className="container py-8">
      <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <div>
          <Carousel className="w-full">
            <CarouselContent>
              {bike.photos.length > 0 ? bike.photos.map((photo, index) => (
                <CarouselItem key={index}>
                  <div className="aspect-video relative rounded-lg overflow-hidden border">
                    <Image src={photo} alt={`Bike photo ${index + 1}`} fill className="object-cover" />
                  </div>
                </CarouselItem>
              )) : (
                <CarouselItem>
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">No photos available</p>
                    </div>
                </CarouselItem>
              )}
            </CarouselContent>
            {bike.photos.length > 1 && <>
                <CarouselPrevious className="ml-16" />
                <CarouselNext className="mr-16" />
            </>}
          </Carousel>
        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">{bike.make} {bike.model}</CardTitle>
                    <CardDescription>
                        <Badge className={cn(bikeStatusStyles[bike.status], "text-base mt-2")}>
                            Status: {bike.status}
                        </Badge>
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <DetailItem label="Serial Number" value={<span className="font-mono">{bike.serialNumber}</span>} />
                    <DetailItem label="Color" value={bike.color} />
                    <DetailItem label="Make" value={bike.make} />
                    <DetailItem label="Model" value={bike.model} />
                </CardContent>
            </Card>

            {bike.status === 'stolen' && bike.theftReport && (
                 <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle className="text-destructive">Theft Report Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <DetailItem label="Date Reported" value={new Date(bike.theftReport.date).toLocaleDateString()} />
                        <DetailItem label="Last Known Location" value={bike.theftReport.location} />
                        <DetailItem label="Details" value={bike.theftReport.details} />
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Manage Bike Status</CardTitle>
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
