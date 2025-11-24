'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HomepageEditor, UsersTable, OngUsersTable } from '@/components/admin-components';
import { HomepageSection, User, OngUser } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminDashboardTabsProps {
  homepageSections: HomepageSection[];
  users: User[];
  nextPageToken?: string;
  ongs: OngUser[];
}

function AdminDashboardTabsContent({ homepageSections, users, nextPageToken, ongs }: AdminDashboardTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const defaultTab = 'content';
  const currentTab = searchParams.get('tab') || defaultTab;
  const [activeTab, setActiveTab] = useState(currentTab);

  // Sync state with URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const onTabChange = (value: string) => {
    setActiveTab(value);
    
    // Create new URLSearchParams object to avoid direct mutation issues
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    
    // Update URL without full reload
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-8">
        <TabsTrigger value="stats">Indicadores</TabsTrigger>
        <TabsTrigger value="content">Gestión de Contenido</TabsTrigger>
        <TabsTrigger value="users">Gestión de Usuarios</TabsTrigger>
        <TabsTrigger value="ongs">Gestión de ONGs</TabsTrigger>
      </TabsList>

      <TabsContent value="stats" className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Próximamente</AlertTitle>
          <AlertDescription>
            El módulo de indicadores y métricas del sistema estará disponible en una futura actualización.
          </AlertDescription>
        </Alert>
      </TabsContent>

      <TabsContent value="content" className="space-y-4">
        <HomepageEditor sections={homepageSections} />
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
