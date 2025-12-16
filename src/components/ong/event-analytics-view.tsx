'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EventAnalyticsData } from '@/lib/data/event-analytics';
import { Users, UserCheck, Percent, DollarSign, Bike, User } from 'lucide-react';
import { GenderDistributionChart } from '@/components/admin/charts/gender-distribution-chart';
import { TopBrandsList } from '@/components/admin/charts/top-brands-list';
import { ModalitiesList } from '@/components/admin/charts/modalities-list';
import { TopUserLocationsList } from '@/components/admin/charts/top-user-locations-list';
import { Separator } from '@/components/ui/separator';

// --- NUEVOS COMPONENTES COMBINADOS ---

/**
 * Tarjeta consolidada que muestra el total de inscritos, los asistentes reales (check-in)
 * y el porcentaje de participación del evento.
 */
function AttendanceSummaryCard({ total, checkedIn, rate }: { total: number; checkedIn: number; rate: number }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Resumen de Asistencia</CardTitle>
                 <CardDescription>Métricas clave de participación.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Inscritos</span>
                    </div>
                    <span className="text-2xl font-bold">{total}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-sm">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Asistentes</span>
                    </div>
                    <span className="text-2xl font-bold">{checkedIn}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-sm">
                        <Percent className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Participación</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">{rate}%</span>
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Tarjeta consolidada que muestra la edad promedio de los participantes y
 * desglosa la distribución de asistentes por rango de edad.
 */
function DemographicsAgeCard({ averageAge, ageRanges, usersWithAge }: { averageAge: number; ageRanges: { name: string; value: number }[], usersWithAge: number }) {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Edad de Participantes</CardTitle>
                <CardDescription>Promedio y distribución por grupo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex items-center justify-center text-center space-x-2 pt-2 pb-4">
                    <User className="h-8 w-8 text-primary" />
                    <div>
                        <p className="text-4xl font-bold">{averageAge}</p>
                        <p className="text-xs text-muted-foreground tracking-widest">AÑOS PROMEDIO</p>
                    </div>
                </div>
                <div className="space-y-3">
                    {ageRanges.map((range) => (
                        <div key={range.name} className="flex items-center text-xs">
                            <div className="w-1/4 font-medium">{range.name}</div>
                            <div className="w-2/4">
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary rounded-full" 
                                        style={{ width: usersWithAge > 0 ? `${(range.value / usersWithAge) * 100}%` : '0%' }}
                                    />
                                </div>
                            </div>
                            <div className="w-1/4 text-right text-muted-foreground font-mono">{range.value}</div>
                        </div>
                    ))}
                </div>
                <div className="text-xs text-muted-foreground text-center pt-2">
                    Basado en {usersWithAge} usuarios con fecha de nacimiento registrada.
                </div>
            </CardContent>
        </Card>
    );
}

// --- COMPONENTE DE VISTA PRINCIPAL ---

function StatCard({ title, value, icon: Icon, description }: any) {
    return (
        <Card>
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
        style: 'currency', currency: 'MXN', notation: 'compact'
    }).format(market.totalAssetValue);

    const formattedAvgValue = new Intl.NumberFormat('es-MX', {
        style: 'currency', currency: 'MXN'
    }).format(market.averageAssetValue);

    // Adaptar datos para los componentes de gráficos reutilizados
    const locationData = general.userLocations.map(item => ({ name: item.name, count: item.value }));
    const brandData = market.topBrands.map(item => ({ name: item.name, count: item.value }));
    const totalModalities = market.topModalities.reduce((sum, item) => sum + item.value, 0);
    const modalityData = market.topModalities.map(item => ({
        name: item.name,
        count: item.value,
        percentage: totalModalities > 0 ? (item.value / totalModalities) * 100 : 0
    }));

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Sección: Indicadores Generales (Refactorizada) */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Asistencia y Demografía
                </h3>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <AttendanceSummaryCard
                        total={general.totalRegistrations}
                        checkedIn={general.checkedInCount}
                        rate={general.attendanceRate}
                    />
                    <DemographicsAgeCard
                        averageAge={general.averageAge}
                        ageRanges={general.ageRanges}
                        usersWithAge={general.usersWithAge}
                    />
                    <div className="lg:col-span-2">
                        <GenderDistributionChart data={general.genderDistribution} />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <TopUserLocationsList data={locationData} />
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
