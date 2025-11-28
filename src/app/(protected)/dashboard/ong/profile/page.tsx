import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/data';
import { getOngProfile } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Globe, Instagram, Facebook } from 'lucide-react';
import Link from 'next/link';
import { CopyButton } from '@/components/ong-components';
import { OngFinancialForm } from '@/components/ong/ong-financial-form';


export default async function OngProfilePage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'ong') {
    redirect('/dashboard');
  }

  const ongProfile = await getOngProfile(user.id);

  if (!ongProfile) {
    return (
      <div className="container py-8 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p>No se pudo cargar el perfil de la organización. Por favor, contacta a soporte.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Perfil de {ongProfile.organizationName}</h1>
          <p className="text-muted-foreground">Gestiona la información y datos de contacto de tu organización.</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Enlace de Invitación</CardTitle>
            <CardDescription>
              Comparte este enlace único con tus miembros para que se unan a tu comunidad en BiciRegistro.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
              <input 
                type="text" 
                readOnly 
                value={ongProfile.invitationLink}
                className="flex-1 p-2 border rounded-md bg-muted text-sm"
              />
              <CopyButton textToCopy={ongProfile.invitationLink} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información de la Organización</CardTitle>
            <CardDescription>
              Detalles y datos de contacto de {ongProfile.organizationName}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Nombre de Contacto</TableCell>
                  <TableCell>{ongProfile.contactPerson}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Ubicación</TableCell>
                  <TableCell>{ongProfile.state}, {ongProfile.country}</TableCell>
                </TableRow>
                 <TableRow>
                  <TableCell className="font-medium">WhatsApp de Contacto</TableCell>
                  <TableCell>{ongProfile.contactWhatsapp}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Redes Sociales</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      {ongProfile.websiteUrl && (
                        <Link href={ongProfile.websiteUrl} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-5 w-5 hover:text-primary transition-colors" />
                        </Link>
                      )}
                      {ongProfile.instagramUrl && (
                        <Link href={ongProfile.instagramUrl} target="_blank" rel="noopener noreferrer">
                          <Instagram className="h-5 w-5 hover:text-primary transition-colors" />
                        </Link>
                      )}
                      {ongProfile.facebookUrl && (
                        <Link href={ongProfile.facebookUrl} target="_blank" rel="noopener noreferrer">
                          <Facebook className="h-5 w-5 hover:text-primary transition-colors" />
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Sección Financiera */}
        <OngFinancialForm initialData={ongProfile.financialData} />

      </div>
    </div>
  );
}
