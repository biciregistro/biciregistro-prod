import Link from 'next/link';
import { getAuthenticatedUser, getUserBikes } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { BikeCard } from '@/components/bike-components';
import { PlusCircle } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  const bikes = await getUserBikes(user.id);

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Tu Garaje</h1>
            <p className="text-muted-foreground">Gestiona tus bicicletas registradas.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/register">
            <PlusCircle className="mr-2 h-4 w-4" />
            Registrar Nueva Bicicleta
          </Link>
        </Button>
      </div>

      {bikes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {bikes.map(bike => (
            <BikeCard key={bike.id} bike={bike} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">Aún no hay bicicletas registradas.</h2>
          <p className="mt-2 text-muted-foreground">
            Comienza registrando tu primera bicicleta.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/register">Registra Tu Bicicleta</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
