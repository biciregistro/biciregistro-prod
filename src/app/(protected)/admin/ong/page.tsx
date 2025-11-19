import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getOngUsers } from '@/lib/data';
import { OngUsersTable } from '@/components/admin-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default async function OngListPage() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'admin') {
    redirect('/dashboard');
  }

  const ongs = await getOngUsers();

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/admin">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Regresar al Panel Principal
            </Button>
          </Link>
        </div>
        <OngUsersTable ongs={ongs} />
      </div>
    </div>
  );
}
