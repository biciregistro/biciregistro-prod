import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getHomepageData, getUsers, getOngUsers, getEventsByOngId } from '@/lib/data';
import { getFinancialSettings, getAllEventsForAdmin } from '@/lib/financial-data';
import type { HomepageSection } from '@/lib/types';
import { AdminDashboardTabs } from '@/components/admin-dashboard-tabs';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'admin') {
    redirect('/dashboard');
  }

  const awaitedSearchParams = await searchParams;

  const query = typeof awaitedSearchParams['query'] === 'string' ? awaitedSearchParams['query'] : undefined;
  const pageToken = typeof awaitedSearchParams['pageToken'] === 'string' ? awaitedSearchParams['pageToken'] : undefined;

  // Parallel data fetching for performance
  const [homepageData, usersData, ongs, adminEvents, financialSettings, allEvents] = await Promise.all([
    getHomepageData(),
    getUsers({ query, pageToken }),
    getOngUsers(),
    getEventsByOngId(user.id),
    getFinancialSettings(),
    getAllEventsForAdmin(),
  ]);

  const { users, nextPageToken } = usersData;

  const homepageSections: HomepageSection[] = Object.entries(homepageData).map(([id, sectionData]) => {
    const typedId = id as HomepageSection['id'];
    return {
      ...sectionData,
      id: typedId,
    } as HomepageSection;
  });

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
              <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
              <p className="text-muted-foreground">Gestiona el contenido, usuarios y organizaciones de Biciregistro.</p>
          </div>
        </div>
        
        <AdminDashboardTabs 
          homepageSections={homepageSections} 
          users={users} 
          nextPageToken={nextPageToken} 
          ongs={ongs}
          events={adminEvents}
          financialSettings={financialSettings}
          allEvents={allEvents}
        />
      </div>
    </div>
  );
}
