import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/data';
import { OngCreationForm } from '@/components/admin-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default async function CreateOngPage() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
         <div className="mb-8">
          <Link href="/admin?tab=ongs">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Regresar a Gestión de ONGs
            </Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Crear Nuevo Usuario ONG/Colectivo</CardTitle>
            <CardDescription>
              Completa el formulario para registrar una nueva organización en la plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OngCreationForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
