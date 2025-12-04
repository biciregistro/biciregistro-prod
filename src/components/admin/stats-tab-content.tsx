import type { DashboardFilters } from '@/lib/types';
import { 
    getBikeStatusCounts, 
    getTopStolenBrands, 
    getTheftsByModality, 
    getGeneralStats, 
    getTopTheftLocations, 
    getUserDemographics,
    getMarketMetrics,
    getFraudPreventionStats,
    getMarketingPotential
} from '@/lib/analytics-data';
import { RecoveryRatePie } from './charts/recovery-rate-pie';
import { TopStolenBrandsChart } from './charts/top-stolen-brands-chart';
import { EcosystemHealthBar } from './charts/ecosystem-health-bar';
import { TheftByModalityChart } from './charts/theft-by-modality-chart';
import { TopTheftLocationsChart } from './charts/top-theft-locations';
import { GeneralStatsSection } from './charts/general-stats-section';
import { AverageAgeCard } from './charts/average-age-card';
import { GenderDistributionChart } from './charts/gender-distribution-chart';
import { TopUserLocationsList } from './charts/top-user-locations-list';
import { TopBrandsList } from './charts/top-brands-list';
import { ModalitiesList } from './charts/modalities-list';
import { MarketValueCard } from './charts/market-value-card';
import { FraudPreventionCard } from './charts/fraud-prevention-card';
import { MarketingPotentialCard } from './charts/marketing-potential-card';
import { Separator } from '@/components/ui/separator';

interface StatsTabContentProps {
  filters: DashboardFilters;
}

export async function StatsTabContent({ filters }: StatsTabContentProps) {
  // Fetch all data in parallel for performance
  const [
      statusCounts, 
      topBrandsStolen, 
      modalityThefts, 
      generalStats, 
      topLocations, 
      userDemographics,
      marketMetrics,
      fraudStats,
      marketingPotential
  ] = await Promise.all([
    getBikeStatusCounts(filters),
    getTopStolenBrands(filters),
    getTheftsByModality(filters),
    getGeneralStats(filters),
    getTopTheftLocations(filters),
    getUserDemographics(filters),
    getMarketMetrics(filters),
    getFraudPreventionStats(),
    getMarketingPotential(filters),
  ]);

  const recoveryData = {
    stolen: statusCounts.stolen,
    recovered: statusCounts.recovered,
    totalThefts: statusCounts.totalThefts,
  };

  const healthData = {
    safe: statusCounts.safe,
    stolen: statusCounts.stolen,
    recovered: statusCounts.recovered,
  };

  return (
    <div className="space-y-8">
      
      {/* SECTION 1: General Stats */}
      <GeneralStatsSection data={generalStats} />

      <Separator className="my-6" />

      {/* SECTION 2: User Demographics */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Perfil Demográfico</h2>
          <p className="text-muted-foreground">
            Análisis de la base de usuarios registrada.
          </p>
        </div>

        <div className="columns-1 md:columns-3 gap-6 space-y-6">
            <div className="break-inside-avoid mb-6">
                <AverageAgeCard 
                    averageAge={userDemographics.averageAge} 
                    averageAgeByGender={userDemographics.averageAgeByGender}
                />
            </div>
            <div className="break-inside-avoid mb-6">
                <GenderDistributionChart data={userDemographics.genderDistribution} />
            </div>
            <div className="break-inside-avoid mb-6">
                <TopUserLocationsList data={userDemographics.topLocations} />
            </div>
        </div>
      </div>

      <Separator className="my-6" />

      {/* SECTION 3: Security Monitor */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Monitor de Seguridad</h2>
          <p className="text-muted-foreground">
            Estadísticas en tiempo real sobre robos, recuperaciones y salud del ecosistema.
          </p>
        </div>

        {/* Metrics Masonry Layout */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          
          {/* Metric 0: Fraud Prevention */}
          <div className="break-inside-avoid mb-6">
            <FraudPreventionCard totalSearches={fraudStats.totalSearches} />
          </div>

          {/* Metric 1: Ecosystem Health */}
          <div className="break-inside-avoid mb-6">
            <EcosystemHealthBar data={healthData} />
          </div>

          {/* Metric 2: Recovery Rate */}
          <div className="break-inside-avoid mb-6">
            <RecoveryRatePie data={recoveryData} />
          </div>
          
          {/* Metric 3: Top Stolen Brands */}
          <div className="break-inside-avoid mb-6">
            <TopStolenBrandsChart data={topBrandsStolen} />
          </div>

          {/* Metric 4: Top Theft Locations */}
          <div className="break-inside-avoid mb-6">
              <TopTheftLocationsChart data={topLocations} />
          </div>

          {/* Metric 5: Theft by Modality */}
          <div className="break-inside-avoid mb-6"> 
              <TheftByModalityChart data={modalityThefts} />
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      {/* SECTION 4: Market Metrics */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Métricas de Mercado</h2>
          <p className="text-muted-foreground">
            Valoración patrimonial y preferencias de consumo.
          </p>
        </div>

        <div className="columns-1 md:columns-3 gap-6 space-y-6">
            {/* Market Value */}
            <div className="break-inside-avoid mb-6">
                <MarketValueCard 
                    totalValue={marketMetrics.totalValue} 
                    averageValue={marketMetrics.averageValue} 
                />
            </div>

            {/* Marketing Potential (NEW - Placed below Market Value due to column flow) */}
            <div className="break-inside-avoid mb-6">
                <MarketingPotentialCard 
                    contactableUsers={marketingPotential.contactableUsers} 
                    percentage={marketingPotential.percentage} 
                />
            </div>

            {/* Top Global Brands */}
            <div className="break-inside-avoid mb-6">
                <TopBrandsList data={marketMetrics.topBrands} />
            </div>

            {/* Modalities Distribution */}
            <div className="break-inside-avoid mb-6">
                <ModalitiesList data={marketMetrics.modalities} />
            </div>
        </div>
      </div>
    </div>
  );
}
