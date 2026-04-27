'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OngProfileForm } from '@/components/ong/ong-profile-form';
import { OngFinancialForm } from '@/components/ong/ong-financial-form';
import type { OngUser } from '@/lib/types';

interface OngSettingsTabsProps {
  ongProfile: OngUser;
}

export function OngSettingsTabs({ ongProfile }: OngSettingsTabsProps) {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="profile">Perfil de la Organización</TabsTrigger>
        <TabsTrigger value="financials">Datos Financieros</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        {/* CORRECCIÓN APLICADA: Se pasa ongProfile como initialData */}
        <OngProfileForm initialData={ongProfile} />
      </TabsContent>
      <TabsContent value="financials">
        <OngFinancialForm ongProfile={ongProfile} />
      </TabsContent>
    </Tabs>
  );
}
