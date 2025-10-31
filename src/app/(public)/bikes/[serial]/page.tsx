import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getBikeBySerial } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Bike } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';


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

export default async function PublicBikePage({ params }: { params: { serial: string } }) {
  const bike = await getBikeBySerial(params.serial);

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
                            <Badge className={cn("text-base", bikeStatusStyles[bike.status])}>{bike.status === 'safe' ? 'A salvo' : bike.status === 'stolen' ? 'Robada' : 'En transferencia'}</Badge>
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

            {bike.status === 'safe' && (
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
