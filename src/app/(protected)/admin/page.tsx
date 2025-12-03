import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getHomepageData, getUsers, getOngUsers, getEventsByOngId } from '@/lib/data';
import { getFinancialSettings, getAllEventsForAdmin } from '@/lib/financial-data';
import type { HomepageSection, DashboardFilters } from '@/lib/types';
import { AdminDashboardTabs } from '@/components/admin-dashboard-tabs';
import { StatsTabContent } from '@/components/admin/stats-tab-content';
import { Skeleton } from '@/components/ui/skeleton';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'admin') {
    redirect('/dashboard');
  }

  // Extract filters for the stats tab
  const filters: DashboardFilters = {
    country: typeof searchParams['country'] === 'string' ? searchParams['country'] : undefined,
    state: typeof searchParams['state'] === 'string' ? searchParams['state'] : undefined,
    brand: typeof searchParams['brand'] === 'string' ? searchParams['brand'] : undefined,
    modality: typeof searchParams['modality'] === 'string' ? searchParams['modality'] : undefined,
    gender: typeof searchParams['gender'] === 'string' ? searchParams['gender'] : undefined,
  };

  const query = typeof searchParams['query'] === 'string' ? searchParams['query'] : undefined;
  const pageToken = typeof searchParams['pageToken'] === 'string' ? searchParams['pageToken'] : undefined;

  // Parallel data fetching for other tabs
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
          statsContent={
            <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
              <StatsTabContent filters={filters} />
            </Suspense>
          }
        />
      </div>
    </div>
  );
}
