'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HomepageEditor, UsersTable, OngUsersTable } from '@/components/admin-components';
import { FinancialSettingsForm } from '@/components/admin/financial-settings-form';
import { AdminEventFinancialList } from '@/components/admin/admin-event-financial-list';
import { HomepageSection, User, OngUser, Event, FinancialSettings } from '@/lib/types';
import { EventCard } from '@/components/ong/event-card';
import { UserPlus, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardFilterBar } from '@/components/admin/dashboard-filter-bar';
// REMOVED: import { StatsTabContent } from '@/components/admin/stats-tab-content';

interface AdminDashboardTabsProps {
  homepageSections: HomepageSection[];
  users: User[];
  nextPageToken?: string;
  ongs: OngUser[];
  events: Event[];
  financialSettings: FinancialSettings;
  allEvents: Event[];
  statsContent: React.ReactNode; // ADDED: Prop for server component
}

function AdminDashboardTabsContent({ 
  homepageSections, 
  users, 
  nextPageToken, 
  ongs, 
  events, 
  financialSettings, 
  allEvents,
  statsContent // ADDED
}: AdminDashboardTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const defaultTab = 'stats'; // Changed default to stats
  const currentTab = searchParams.get('tab') || defaultTab;
  const [activeTab, setActiveTab] = useState(currentTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const onTabChange = (value: string) => {
    setActiveTab(value);
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-6 mb-8">
        <TabsTrigger value="stats">Indicadores</TabsTrigger>
        <TabsTrigger value="content">Contenido</TabsTrigger>
        <TabsTrigger value="users">Usuarios</TabsTrigger>
        <TabsTrigger value="ongs">ONGs</TabsTrigger>
        <TabsTrigger value="events">Eventos</TabsTrigger>
        <TabsTrigger value="finance">Finanzas</TabsTrigger>
      </TabsList>

      <TabsContent value="stats" className="space-y-4">
        <DashboardFilterBar />
        {statsContent} {/* CHANGED: Render prop */}
      </TabsContent>

      <TabsContent value="content" className="space-y-4">
        <HomepageEditor sections={homepageSections} />
      </TabsContent>

      <TabsContent value="users" className="space-y-4">
        <UsersTable users={users} nextPageToken={nextPageToken} />
      </TabsContent>

      {/* ... other tabs remain the same ... */}
       <TabsContent value="ongs" className="space-y-4">
         <div className="flex justify-end mb-4">
             <Link href="/admin/ong/create">
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Agregar Nueva ONG
                </Button>
            </Link>
         </div>
        <OngUsersTable ongs={ongs} />
      </TabsContent>

      <TabsContent value="events" className="space-y-4">
        <div className="flex justify-end mb-4">
            <Link href="/admin/events/create">
              <Button>
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Crear Nuevo Evento
              </Button>
            </Link>
        </div>
        
        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} basePath="/admin/events" />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg bg-muted/10">
            <p className="text-muted-foreground mb-4">No has creado ningún evento aún.</p>
            <Link href="/admin/events/create">
                <Button variant="outline">
                    Crear mi primer evento
                </Button>
            </Link>
          </div>
        )}
      </TabsContent>

      <TabsContent value="finance" className="space-y-6">
          <FinancialSettingsForm initialSettings={financialSettings} />
          
          <AdminEventFinancialList events={allEvents} />
      </TabsContent>
    </Tabs>
  );
}

export function AdminDashboardTabs(props: AdminDashboardTabsProps) {
  return (
    <Suspense fallback={<div>Cargando panel de administración...</div>}>
      <AdminDashboardTabsContent {...props} />
    </Suspense>
  );
}
