import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getBikes } from '@/lib/data';
import Link from 'next/link';
import type { Bike } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { BikeCard } from '@/components/bike-components';
import { Separator } from '@/components/ui/separator';

import { PlusCircle, Edit } from 'lucide-react';

// Action Panel component defined directly in the page for clarity and co-location.
function ActionPanel({ user }: { user: { name: string } }) {
    return (
        <div className="p-6 bg-card border rounded-lg mb-8">
            <h1 className="text-2xl font-bold">¡Hola, {user.name}!</h1>
            <p className="text-muted-foreground mb-4">Bienvenido a tu garaje. Desde aquí puedes gestionar tus bicicletas y tu perfil.</p>
            <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild>
                    <Link href="/dashboard/profile">
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Perfil
                    </Link>
                </Button>
                <Button asChild>
                    <Link href="/dashboard/register">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Registrar Bici
                    </Link>
                </Button>
            </div>
        </div>
    );
}

export default async function DashboardPage() {
    const user = await getAuthenticatedUser();
    if (!user) {
        redirect('/login');
    }

    const bikes = await getBikes({ userId: user.id });

    return (
        <div className="container max-w-5xl mx-auto py-6 md:py-8 px-4">
            {/* Action Panel */}
            <ActionPanel user={user} />

            <h2 className="text-2xl font-bold mb-6">Tus Bicicletas</h2>
            
            {/* Bikes List */}
            {bikes.length === 0 ? (
                 <Alert>
                    <AlertTitle>No tienes bicicletas registradas</AlertTitle>
                    <AlertDescription>
                        Usa el botón "Registrar Bici" para añadir tu primera bicicleta y empezar a protegerla.
                    </AlertDescription>
                </Alert>
            ) : (
                <div className="space-y-4">
                    {bikes.map((bike: Bike) => (
                        <BikeCard key={bike.id} bike={bike} />
                    ))}
                </div>
            )}
        </div>
    );
}
