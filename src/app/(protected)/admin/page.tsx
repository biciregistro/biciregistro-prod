import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getHomepageData, getUsers, getOngUsers, getEventsByOngId, getAllStolenBikes } from '@/lib/data';
import { getFinancialSettings, getAllEventsForAdmin } from '@/lib/financial-data';
import { getLandingEventsContent } from '@/lib/data/landing-events-data'; 
import type { HomepageSection, DashboardFilters, LandingEventsContent } from '@/lib/types';
import { AdminDashboardTabs } from '@/components/admin-dashboard-tabs';
import { StatsTabContent } from '@/components/admin/stats-tab-content';
import { Skeleton } from '@/components/ui/skeleton';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'admin') {
    redirect('/dashboard');
  }

  const initialTab = typeof resolvedSearchParams['tab'] === 'string' ? resolvedSearchParams['tab'] : 'stats';

  const filters: DashboardFilters = {
    country: typeof resolvedSearchParams['country'] === 'string' ? resolvedSearchParams['country'] : undefined,
    state: typeof resolvedSearchParams['state'] === 'string' ? resolvedSearchParams['state'] : undefined,
    brand: typeof resolvedSearchParams['brand'] === 'string' ? resolvedSearchParams['brand'] : undefined,
    modality: typeof resolvedSearchParams['modality'] === 'string' ? resolvedSearchParams['modality'] : undefined,
    gender: typeof resolvedSearchParams['gender'] === 'string' ? resolvedSearchParams['gender'] : undefined,
  };

  const query = typeof resolvedSearchParams['query'] === 'string' ? resolvedSearchParams['query'] : undefined;
  const pageToken = typeof resolvedSearchParams['pageToken'] === 'string' ? resolvedSearchParams['pageToken'] : undefined;

  // Parallel data fetching
  const [
    homepageData, 
    landingEventsContent, 
    usersData, 
    ongs, 
    adminEvents, 
    financialSettings, 
    allEvents,
    stolenBikes // NUEVO: Obtener todas las bicis robadas
  ] = await Promise.all([
    getHomepageData(),
    getLandingEventsContent(), 
    getUsers({ query, pageToken }),
    getOngUsers(),
    getEventsByOngId(user.id),
    getFinancialSettings(),
    getAllEventsForAdmin(),
    getAllStolenBikes(),
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
          initialTab={initialTab}
          homepageSections={homepageSections} 
          landingEventsContent={landingEventsContent} 
          users={users} 
          nextPageToken={nextPageToken} 
          ongs={ongs}
          events={adminEvents}
          financialSettings={financialSettings}
          allEvents={allEvents}
          stolenBikes={stolenBikes} // NUEVO: Pasar datos
          statsContent={
            <Suspense key={JSON.stringify(filters)} fallback={<Skeleton className="h-[400px] w-full" />}>
              <StatsTabContent filters={filters} />
            </Suspense>
          }
        />
      </div>
    </div>
  );
}
