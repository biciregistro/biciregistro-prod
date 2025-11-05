import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getBikes } from '@/lib/data';
import Link from 'next/link';
import Image from 'next/image';
import { Bike, User, BikeStatus } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

import { PlusCircle, Edit, Shield, ShieldCheck, ShieldAlert, ArrowRightLeft } from 'lucide-react';

function getStatusBadge(status: BikeStatus) {
    switch (status) {
      case 'safe':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700"><ShieldCheck className="mr-2 h-4 w-4" />Segura</Badge>;
      case 'stolen':
        return <Badge variant="destructive"><ShieldAlert className="mr-2 h-4 w-4" />Robada</Badge>;
      case 'in_transfer':
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><ArrowRightLeft className="mr-2 h-4 w-4" />En Transferencia</Badge>;
    }
}

export default async function DashboardPage() {
    const user = await getAuthenticatedUser();
    if (!user) {
        redirect('/login');
    }

    const bikes = await getBikes({ userId: user.id });

    return (
        <div className="container py-6 md:py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>{user.name} {user.lastName}</CardTitle>
                            <CardDescription>{user.email}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild className="w-full">
                                <Link href="/dashboard/profile">
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar Perfil
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold">Tu Garaje</h2>
                        <Button asChild>
                            <Link href="/dashboard/register">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Registrar Bici
                            </Link>
                        </Button>
                    </div>

                    {bikes.length === 0 ? (
                         <Alert>
                            <AlertTitle>¡Bienvenido a tu Garaje!</AlertTitle>
                            <AlertDescription>
                                Aún no has registrado ninguna bicicleta. ¡Agrega tu primera bici para empezar a protegerla!
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-4">
                            {bikes.map((bike: Bike) => (
                                <Card key={bike.id}>
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="relative w-24 h-24 rounded-md overflow-hidden">
                                        <Image 
                                            src={bike.photos[0] || '/placeholder.png'} 
                                            alt={`${bike.make} ${bike.model}`}
                                            fill
                                            style={{ objectFit: 'cover' }}
                                            />
                                        </div>
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-semibold">{bike.make} {bike.model}</h3>
                                                    <p className="text-sm text-muted-foreground">{bike.serialNumber}</p>
                                                </div>
                                                {getStatusBadge(bike.status)}
                                            </div>
                                            <div className="mt-2">
                                                <Button asChild size="sm" variant="outline">
                                                    <Link href={`/dashboard/bikes/${bike.id}`}>
                                                        Ver Detalles
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
