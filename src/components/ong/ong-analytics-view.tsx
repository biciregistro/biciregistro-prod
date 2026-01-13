
import { getOngAnalytics } from '@/lib/data/ong-analytics';
import { getAuthenticatedUser } from '@/lib/data'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator'; 
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
import { GenerationsChart } from '@/components/admin/charts/generations-chart';
import { GenerationInsightsCard } from '@/components/admin/charts/generation-insights-card';

// --- Local Helpers ---

function CombinedStatCard({ totalUsers, totalBikes }: { totalUsers: number; totalBikes: number; }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Comunidad</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col justify-center items-center space-y-4 pt-2">
                <div className="flex items-center space-x-4">
                    <Users className="h-6 w-6 text-muted-foreground" />
                    <div className="text-center">
                        <p className="text-2xl font-bold">{totalUsers}</p>
                        <p className="text-xs text-muted-foreground">Usuarios</p>
                    </div>
                </div>
                <Separator />
                <div className="flex items-center space-x-4">
                    <BikeIcon className="h-6 w-6 text-muted-foreground" />
                    <div className="text-center">
                        <p className="text-2xl font-bold">{totalBikes}</p>
                        <p className="text-xs text-muted-foreground">Bicicletas</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Helper to transform Record to Array with specific keys to satisfy TypeScript
const toValueData = (record: Record<string, number>) => {
    return Object.entries(record)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
};

const toCountData = (record: Record<string, number>) => {
    return Object.entries(record)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
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

const getDominantGeneration = (record: Record<string, number>) => {
    const entries = Object.entries(record);
    if (entries.length === 0) return 'unknown';
    return entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0];
};

const toGenData = (record: Record<string, number>) => {
    const labels: Record<string, string> = {
        'gen_z': 'Gen Z',
        'millennials': 'Millennials',
        'gen_x': 'Gen X',
        'boomers': 'Boomers'
    };
    return Object.entries(record).map(([id, value]) => ({
        name: labels[id] || id,
        value
    }));
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
  const dominantGen = getDominantGeneration(general.generationsDistribution);

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
            <CombinedStatCard 
                totalUsers={general.totalUsers}
                totalBikes={general.totalBikes}
            />
            <AverageAgeCard 
                averageAge={general.averageAge} 
                averageAgeByGender={general.averageAgeByGender} 
            />
            <GenderDistributionChart data={toValueData(general.genderDistribution)} />
            <TopUserLocationsList data={toCountData(general.userLocations)} />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight mb-4 text-primary flex items-center gap-2">
            Perfiles Generacionales
            <Badge variant="outline" className="text-[10px] uppercase">Nuevo</Badge>
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-1">
                <GenerationsChart data={toGenData(general.generationsDistribution)} />
            </div>
            <div className="lg:col-span-2">
                <GenerationInsightsCard dominantGenerationId={dominantGen} />
            </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Datos de Mercado</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MarketValueCard totalValue={market.assetValue} averageValue={market.averageValue} />
            {/* Brands List requires 'count' */}
            <TopBrandsList data={toCountData(market.topBrands)} />
            <ModalitiesList data={toModalityData(market.modalities)} />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Monitor de Seguridad</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-3">
                <EcosystemHealthBar data={security.counts} />
            </div>
            {/* Stolen Brands requires 'count' */}
            <TopStolenBrandsChart data={toCountData(security.topStolenBrands)} />
            {/* Theft Modality is a PieChart, requires 'value' */}
            <TheftByModalityChart data={toValueData(security.theftsByModality)} />
            {/* Theft Locations requires 'count' */}
            <TopTheftLocationsChart data={toCountData(security.topTheftLocations)} />
        </div>
      </section>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${variant === 'outline' ? 'border border-primary text-primary' : 'bg-primary text-primary-foreground'} ${className}`}>{children}</span>;
}
