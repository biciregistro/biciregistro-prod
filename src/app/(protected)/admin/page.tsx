import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getHomepageData } from '@/lib/data';
import { HomepageEditor } from '@/components/admin-components';
import type { HomepageSection } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Users, Building } from 'lucide-react';

export default async function AdminPage() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'admin') {
    redirect('/dashboard');
  }

  const homepageData = await getHomepageData();
  
  // Correctly transform the object into an array, preserving the ID and satisfying TypeScript.
  const homepageSections: HomepageSection[] = Object.entries(homepageData).map(([id, sectionData]) => {
    // Assert the type of 'id' to match the discriminated union.
    const typedId = id as HomepageSection['id'];
    
    // Return the full section object with the correctly typed id.
    return {
      ...sectionData,
      id: typedId,
    } as HomepageSection; // Assert the final object shape for safety.
  });

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
              <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
              <p className="text-muted-foreground">Gestiona la configuración de tu aplicación.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/ong">
              <Button variant="outline" size="sm">
                <Building className="mr-2 h-4 w-4" />
                Gestionar ONGs
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button size="sm">
                 <Users className="mr-2 h-4 w-4" />
                Gestionar Usuarios
              </Button>
            </Link>
          </div>
        </div>
        <div className="my-8">
          <HomepageEditor sections={homepageSections} />
        </div>
      </div>
    </div>
  );
}
