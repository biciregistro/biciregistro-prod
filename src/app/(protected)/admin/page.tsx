import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser, getHomepageData, getUsers, getOngUsers, getEventsByOngId, getAllStolenBikes } from '@/lib/data';
import { getFinancialSettings, getAllEventsForAdmin } from '@/lib/financial-data';
import { getLandingEventsContent } from '@/lib/data/landing-events-data'; 
import { getBikonDevices } from '@/lib/actions/bikon-actions'; 
import { getAdvertisersList } from '@/lib/actions/campaign-actions';
import type { HomepageSection, DashboardFilters, User, OngUser, Event, FinancialSettings, Bike, BikonDevicePopulated, LandingEventsContent } from '@/lib/types';
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

  // --- Conditional Data Fetching ---
  
  // Initialize with safe defaults
  let homepageSections: HomepageSection[] = [];
  // Dummy content to satisfy type requirements if not fetched, but won't be rendered
  let landingEventsContent: LandingEventsContent = { 
      hero: { title: '', subtitle: '', ctaButton: '', trustCopy: '', backgroundImageUrl: '' }, 
      painPointsSection: { title: '', points: [{id: '1', title:'', description:''}, {id: '2', title:'', description:''}, {id: '3', title:'', description:''}] }, 
      solutionSection: { title: '', solutions: [{id: '1', title:'', description:''}, {id: '2', title:'', description:''}, {id: '3', title:'', description:''}] }, 
      featureSection: { title: '', description: '', imageUrl: '' }, 
      socialProofSection: { allies: [] }, 
      ctaSection: { title: '', description: '', ctaButton: '' } 
  };
  
  let usersData: { users: User[], nextPageToken?: string } = { users: [], nextPageToken: undefined };
  let ongs: OngUser[] = [];
  let adminEvents: Event[] = [];
  let financialSettings: FinancialSettings = { commissionRate: 0, pasarelaRate: 0, pasarelaFixed: 0, ivaRate: 0 };
  let allEvents: any[] = [];
  let stolenBikes: (Bike & { owner?: User })[] = [];
  let bikonDevices: BikonDevicePopulated[] = [];
  let advertisers: {id: string, name: string}[] = [];

  
  if (initialTab === 'content') {
      const [homepageData, fetchedLandingContent] = await Promise.all([
          getHomepageData(),
          getLandingEventsContent()
      ]);
      
      landingEventsContent = fetchedLandingContent;

      homepageSections = Object.entries(homepageData).map(([id, sectionData]) => {
        const typedId = id as HomepageSection['id'];
        return {
          ...sectionData, // @ts-ignore
          id: typedId,
        } as HomepageSection;
      });
  }

  if (initialTab === 'users') {
      usersData = await getUsers({ query, pageToken });
  }

  if (initialTab === 'ongs') {
      ongs = await getOngUsers();
  }

  if (initialTab === 'events') {
      adminEvents = await getEventsByOngId(user.id);
  }

  if (initialTab === 'finance') {
      [financialSettings, allEvents] = await Promise.all([
          getFinancialSettings(),
          getAllEventsForAdmin()
      ]);
  }

  if (initialTab === 'thefts') {
      stolenBikes = await getAllStolenBikes();
  }

  if (initialTab === 'bikon') {
      bikonDevices = await getBikonDevices();
  }

  if (initialTab === 'campaigns') {
      advertisers = await getAdvertisersList();
  }

  const { users, nextPageToken } = usersData;

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
          stolenBikes={stolenBikes}
          bikonDevices={bikonDevices}
          advertisers={advertisers}
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
