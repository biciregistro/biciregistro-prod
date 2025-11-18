import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getUsers } from '@/lib/data';
import { UsersTable } from '@/components/admin-components';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'admin') {
    redirect('/dashboard');
  }

  const pageToken = typeof searchParams.pageToken === 'string' ? searchParams.pageToken : undefined;
  const { users, nextPageToken } = await getUsers(100, pageToken);

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
              <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
              <p className="text-muted-foreground">Administra los usuarios de la plataforma.</p>
          </div>
        </div>
        <div className="mb-8">
          <Link href="/admin">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Regresar al Panel Principal
            </Button>
          </Link>
        </div>
        <div className="my-8">
          <UsersTable users={users} nextPageToken={nextPageToken} />
        </div>
      </div>
    </div>
  );
}
