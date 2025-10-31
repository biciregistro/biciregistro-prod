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
        <h1 className="text-3xl font-bold tracking-tight text-center mb-4">Public Bike Search</h1>
        <p className="text-muted-foreground text-center mb-8">
            Verify a bike&apos;s status before you buy. Enter a serial number to check our public database.
        </p>
        <BikeSearchForm />

        <div className="mt-12">
            {serial && !bike && (
                 <Card>
                    <CardContent className="p-8 text-center">
                        <p>No bike found with serial number: <strong>{serial}</strong></p>
                    </CardContent>
                </Card>
            )}
            {bike && (
                <Card>
                    <CardHeader>
                        <CardTitle>Search Result</CardTitle>
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
                                <p className="text-sm font-medium text-muted-foreground">Status</p>
                                <Badge className={cn(bikeStatusStyles[bike.status], "text-base")}>
                                    {bike.status}
                                </Badge>
                             </div>
                             {bike.status === 'stolen' && (
                                <p className="text-sm text-destructive">This bike has been reported as stolen. Do not purchase. If you have information, please contact local authorities.</p>
                             )}
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Serial Number</p>
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
