import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getHomepageData } from '@/lib/data';
import { HomepageEditor } from '@/components/admin-components';
import type { HomepageSection } from '@/lib/types';

export default async function AdminPage() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'admin') {
    // In a real app, you might want to show an "Unauthorized" page
    // or just redirect to the main dashboard.
    redirect('/dashboard');
  }

  const homepageData = await getHomepageData();
  // Convert the object of sections into an array for the component
  const homepageSections: HomepageSection[] = Object.values(homepageData);

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
            <p className="text-muted-foreground">Gestiona la configuración de tu aplicación.</p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto">
        <HomepageEditor sections={homepageSections} />
      </div>
    </div>
  );
}
