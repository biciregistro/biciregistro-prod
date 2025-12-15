
import { getOngAnalytics } from '@/lib/data/ong-analytics';
import { getAuthenticatedUser } from '@/lib/data'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal, Users, Bike as BikeIcon } from 'lucide-react';

// Admin Charts (Named Imports)
import { AverageAgeCard } from '@/components/admin/charts/average-age-card';
import { EcosystemHealthBar } from '@/components/admin/charts/ecosystem-health-bar';
import { GenderDistributionChart } from '@/components/admin/charts/gender-distribution-chart';
import { MarketValueCard } from '@/components/admin/charts/market-value-card';
import { TopBrandsList } from '@/components/admin/charts/top-brands-list';
import { TopStolenBrandsChart } from '@/components/admin/charts/top-stolen-brands-chart';
import { TheftByModalityChart } from '@/components/admin/charts/theft-by-modality-chart';
import { TopTheftLocationsChart } from '@/components/admin/charts/top-theft-locations';
import { ModalitiesList } from '@/components/admin/charts/modalities-list';
import { TopUserLocationsList } from '@/components/admin/charts/top-user-locations-list';

// --- Local Helpers ---

function StatCard({ title, value, icon: Icon }: { title: string, value: number | string, icon: any }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
}

const toChartData = (record: Record<string, number>, keyName: 'value' | 'count' = 'value') => {
    return Object.entries(record)
        .map(([name, val]) => ({ name, [keyName]: val }))
        .sort((a, b) => (b[keyName] as number) - (a[keyName] as number));
};

const toModalityData = (record: Record<string, number>) => {
    const total = Object.values(record).reduce((a, b) => a + b, 0);
    return Object.entries(record)
        .map(([name, count]) => ({ 
            name, 
            count, 
            percentage: total > 0 ? (count / total) * 100 : 0 
        }))
        .sort((a, b) => b.count - a.count);
};

// --- Main Component ---

export default async function OngAnalyticsView() {
  const user = await getAuthenticatedUser();
  const ongId = user?.role === 'ong' ? user.id : user?.communityId;

  if (!ongId) {
    return (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>No se pudo identificar la comunidad.</AlertDescription>
        </Alert>
    );
  }

  const data = await getOngAnalytics(ongId);

  if (!data) {
    return (
        <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Sin datos</AlertTitle>
            <AlertDescription>Aún no hay suficiente actividad para generar reportes.</AlertDescription>
        </Alert>
    );
  }

  const { general, market, security } = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Alert>
        <Terminal className="h-4 w-4" />
        <AlertTitle>Actualización Automática</AlertTitle>
        <AlertDescription>Los datos de este tablero se actualizan cada 60 minutos.</AlertDescription>
      </Alert>

      <section>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Datos Generales</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Usuarios" value={general.totalUsers} icon={Users} />
            <StatCard title="Bicicletas" value={general.totalBikes} icon={BikeIcon} />
            <AverageAgeCard 
                averageAge={general.averageAge} 
                averageAgeByGender={general.averageAgeByGender} 
            />
            <GenderDistributionChart data={toChartData(general.genderDistribution, 'value')} />
            <TopUserLocationsList data={toChartData(general.userLocations, 'count')} />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Datos de Mercado</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MarketValueCard totalValue={market.assetValue} averageValue={market.averageValue} />
            <TopBrandsList data={toChartData(market.topBrands, 'count')} />
            <ModalitiesList data={toModalityData(market.modalities)} />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Monitor de Seguridad</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-3">
                <EcosystemHealthBar data={security.counts} />
            </div>
            <TopStolenBrandsChart data={toChartData(security.topStolenBrands, 'count')} />
            <TheftByModalityChart data={toChartData(security.theftsByModality, 'value')} />
            <TopTheftLocationsChart data={toChartData(security.topTheftLocations, 'count')} />
        </div>
      </section>
    </div>
  );
}
