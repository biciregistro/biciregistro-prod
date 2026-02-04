'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HomepageEditor, UsersTable, OngUsersTable } from '@/components/admin-components';
import { FinancialSettingsForm } from '@/components/admin/financial-settings-form';
import { AdminEventFinancialList } from '@/components/admin/admin-event-financial-list';
import { HomepageSection, User, OngUser, Event, FinancialSettings, LandingEventsContent, Bike } from '@/lib/types';
import { EventCard } from '@/components/ong/event-card';
import { UserPlus, CalendarPlus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardFilterBar } from '@/components/admin/dashboard-filter-bar';
import { NotificationComposer } from '@/components/admin/notifications/notification-composer';
import { LandingEventsEditor } from './admin/landing-editor/landing-events-editor';
import { StolenBikesList } from './admin/stolen-bikes-list';

interface AdminDashboardTabsProps {
  homepageSections: HomepageSection[];
  landingEventsContent: LandingEventsContent;
  users: User[];
  nextPageToken?: string;
  ongs: OngUser[];
  events: Event[];
  financialSettings: FinancialSettings;
  allEvents: any[];
  stolenBikes: (Bike & { owner?: User })[]; // Nuevo prop
  statsContent: React.ReactNode;
  initialTab?: string;
}

function AdminDashboardTabsContent({ 
  homepageSections, 
  landingEventsContent,
  users, 
  nextPageToken, 
  ongs, 
  events, 
  financialSettings, 
  allEvents,
  stolenBikes, // Nuevo prop
  statsContent,
  initialTab = 'stats'
}: AdminDashboardTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // FIX: Inicializar estados con valores deterministas para evitar Hydration Mismatch.
  // Dejamos que useEffect sincronice con la URL en el cliente.
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeSubTab, setActiveSubTab] = useState('homepage');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
    const subtab = searchParams.get('subtab');
    if (subtab && subtab !== activeSubTab) {
      setActiveSubTab(subtab);
    }
  }, [searchParams, activeTab, activeSubTab]);

  const onTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    params.delete('subtab'); 
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const onSubTabChange = (value: string) => {
    setActiveSubTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set('subtab', value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };


  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 mb-8 h-auto">
        <TabsTrigger value="stats">Indicadores</TabsTrigger>
        <TabsTrigger value="thefts" className="gap-1.5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Alertas
        </TabsTrigger>
        <TabsTrigger value="content">Contenido</TabsTrigger>
        <TabsTrigger value="users">Usuarios</TabsTrigger>
        <TabsTrigger value="ongs">ONGs</TabsTrigger>
        <TabsTrigger value="events">Eventos</TabsTrigger>
        <TabsTrigger value="finance">Finanzas</TabsTrigger>
        <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
      </TabsList>

      <TabsContent value="stats" className="space-y-4">
        <DashboardFilterBar />
        {statsContent}
      </TabsContent>

      <TabsContent value="thefts" className="space-y-6">
          <div className="flex flex-col gap-2 mb-6">
              <h2 className="text-2xl font-bold">Alertas de Robo de la Comunidad</h2>
              <p className="text-muted-foreground">Difunde los reportes de robo activos en las redes sociales oficiales.</p>
          </div>
          <StolenBikesList bikes={stolenBikes} />
      </TabsContent>

      <TabsContent value="content" className="space-y-4">
        <Tabs value={activeSubTab} onValueChange={onSubTabChange}>
          <TabsList>
            <TabsTrigger value="homepage">Homepage</TabsTrigger>
            <TabsTrigger value="events_manager">Landing Events Manager</TabsTrigger>
          </TabsList>
          <TabsContent value="homepage" className="mt-4">
            <HomepageEditor sections={homepageSections} />
          </TabsContent>
          <TabsContent value="events_manager" className="mt-4">
            <LandingEventsEditor content={landingEventsContent} />
          </TabsContent>
        </Tabs>
      </TabsContent>

      <TabsContent value="users" className="space-y-4">
        <UsersTable users={users} nextPageToken={nextPageToken} />
      </TabsContent>

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

      <TabsContent value="notifications" className="space-y-6">
          <NotificationComposer />
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
