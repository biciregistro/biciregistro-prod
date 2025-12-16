'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EventAnalyticsData } from '@/lib/data/event-analytics';
import { Users, UserCheck, Percent, DollarSign, Bike, MapPin } from 'lucide-react';
import { GenderDistributionChart } from '@/components/admin/charts/gender-distribution-chart';
import { AverageAgeCard } from '@/components/admin/charts/average-age-card';
import { TopBrandsList } from '@/components/admin/charts/top-brands-list';
import { ModalitiesList } from '@/components/admin/charts/modalities-list';
import { TopUserLocationsList } from '@/components/admin/charts/top-user-locations-list';
import { Separator } from '@/components/ui/separator';

function StatCard({ title, value, icon: Icon, description, className }: any) {
    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );
}

export function EventAnalyticsView({ data }: { data: EventAnalyticsData }) {
    if (!data) return <div className="p-4">No hay datos disponibles aún.</div>;

    const { general, market } = data;

    const formattedAssetValue = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        notation: 'compact'
    }).format(market.totalAssetValue);

    const formattedAvgValue = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(market.averageAssetValue);

    // Transform data to match component interfaces
    const averageAgeByGender = [
        { gender: 'Masculino', average: 0 },
        { gender: 'Femenino', average: 0 }
    ]; // Placeholder as current data structure doesn't support gender breakdown for age average yet in event-analytics.ts

    const locationData = general.userLocations.map(item => ({
        name: item.name,
        count: item.value
    }));

    const brandData = market.topBrands.map(item => ({
        name: item.name,
        count: item.value
    }));

    const totalModalities = market.topModalities.reduce((sum, item) => sum + item.value, 0);
    const modalityData = market.topModalities.map(item => ({
        name: item.name,
        count: item.value,
        percentage: totalModalities > 0 ? (item.value / totalModalities) * 100 : 0
    }));

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Sección: Indicadores Generales */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Asistencia y Demografía
                </h3>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard 
                        title="Total Inscritos" 
                        value={general.totalRegistrations} 
                        icon={Users} 
                    />
                    <StatCard 
                        title="Asistentes Reales" 
                        value={general.checkedInCount} 
                        icon={UserCheck} 
                        description="Check-in realizado"
                    />
                    <StatCard 
                        title="% Participación" 
                        value={`${general.attendanceRate}%`} 
                        icon={Percent} 
                        description="Tasa de conversión"
                    />
                    {/* Reuse AverageAgeCard but we need to adapt props or logic */}
                    <AverageAgeCard 
                        averageAge={general.averageAge} 
                        averageAgeByGender={averageAgeByGender} 
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <div className="lg:col-span-2">
                        <GenderDistributionChart data={general.genderDistribution} />
                    </div>
                    <div className="lg:col-span-2">
                         <TopUserLocationsList data={locationData} />
                    </div>
                     <div className="lg:col-span-3">
                         <Card className="h-full">
                            <CardHeader>
                                <CardTitle>Rango de Edades</CardTitle>
                                <CardDescription>Distribución por grupos</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {general.ageRanges.map((range) => (
                                        <div key={range.name} className="flex items-center">
                                            <div className="w-16 text-sm font-medium">{range.name}</div>
                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-primary" 
                                                    style={{ width: general.totalRegistrations > 0 ? `${(range.value / general.totalRegistrations) * 100}%` : '0%' }}
                                                />
                                            </div>
                                            <div className="w-12 text-right text-sm text-muted-foreground">{range.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                         </Card>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Sección: Indicadores de Mercado */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Indicadores de Mercado (Bicicletas)
                </h3>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-4">
                        <StatCard 
                            title="Valor Patrimonial Total" 
                            value={formattedAssetValue} 
                            icon={DollarSign} 
                            description="Suma estimada del valor de bicicletas"
                        />
                        <StatCard 
                            title="Valor Promedio" 
                            value={formattedAvgValue} 
                            icon={Bike} 
                            description="Por bicicleta registrada"
                        />
                    </div>
                    
                    <div className="md:col-span-1">
                        <TopBrandsList data={brandData} />
                    </div>

                    <div className="md:col-span-1">
                        <ModalitiesList data={modalityData} />
                    </div>
                </div>
            </div>
        </div>
    );
}
