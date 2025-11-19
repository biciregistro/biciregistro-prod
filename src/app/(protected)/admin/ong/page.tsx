import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getOngUsers } from '@/lib/data';
import { OngUsersTable } from '@/components/admin-components';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default async function OngListPage() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'admin') {
    redirect('/dashboard');
  }

  const ongs = await getOngUsers();

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Gestión de ONGs</h1>
            <div className="flex items-center gap-2">
                 <Link href="/admin/ong/create">
                    <Button variant="outline">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Agregar Nueva ONG
                    </Button>
                </Link>
                <Link href="/admin">
                    <Button>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Regresar
                    </Button>
                </Link>
            </div>
        </div>
        <OngUsersTable ongs={ongs} />
      </div>
    </div>
  );
}
