import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebase/server';
import { HeroBannerSerial } from '@/components/public/serial/hero-banner-serial';
import { SponsorsCarousel } from '@/components/shared/sponsors-carousel';
import { StagesFeed } from '@/components/public/serial/stages-feed';
import { SerialLeaderboardView } from '@/components/public/serial/serial-leaderboard-view';
import type { Serial, Event, OngUser, SerialLeaderboard } from '@/lib/types';

export const revalidate = 60; // ISR cache de 1 min

async function getSerialData(slug: string) {
    // Protección contra undefined (como lo marcó el error de Next.js)
    if (!slug) return null;

    const serialSnapshot = await adminDb.collection('serials')
        .where('slug', '==', slug)
        .limit(1)
        .get();

    if (serialSnapshot.empty) {
        return null;
    }

    // RCA FIX: Mapear explícitamente el ID del documento al objeto de datos
    const serial = { 
        id: serialSnapshot.docs[0].id, 
        ...serialSnapshot.docs[0].data() 
    } as Serial;

    // Ejecutar consultas en paralelo para mejorar el performance
    const [ongSnapshot, eventsSnapshot, leaderboardsSnapshot] = await Promise.all([
        adminDb.collection('ong-profiles').doc(serial.ongId).get(),
        adminDb.collection('events')
            .where('serialId', '==', serial.id)
            .where('isSerialStage', '==', true)
            .orderBy('date', 'asc')
            .get(),
        adminDb.collection('serial_leaderboards')
            .where('serialId', '==', serial.id)
            .get()
    ]);

    const ongData = ongSnapshot.data() as OngUser | undefined;
    
    const stages = eventsSnapshot.docs.map(doc => {
        const data = doc.data();
        let dateStr = data.date;
        if (dateStr && typeof dateStr.toDate === 'function') dateStr = dateStr.toDate().toISOString();
        else if (dateStr && dateStr instanceof Date) dateStr = dateStr.toISOString();
        return { ...data, id: doc.id, date: dateStr } as Event;
    });

    const leaderboards = leaderboardsSnapshot.docs.map(doc => doc.data() as SerialLeaderboard);

    // Extraer todas las categorías únicas del serial basándonos en los eventos hijos (si el serial no las tiene centralizadas)
    // Para el MVP, asumimos que si el campeonato tiene eventos, extraemos las categorías del primer evento
    let categories: {id: string, name: string}[] = [];
    if (serial.categories && serial.categories.length > 0) {
        categories = serial.categories.map(c => ({ id: c.id, name: c.name }));
    } else if (stages.length > 0 && stages[0].categories) {
        categories = stages[0].categories.map(c => ({ id: c.id, name: c.name }));
    }

    return { serial, ongData, stages, leaderboards, categories };
}

// FIX para el Error de Next.js 15: `params` is a Promise and must be unwrapped with `await`
type Props = {
    params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolvedParams = await params;
    const data = await getSerialData(resolvedParams.slug);
    if (!data) return { title: 'Serial no encontrado' };

    return {
        title: `${data.serial.name} | BiciRegistro`,
        description: data.serial.description.substring(0, 160),
    };
}

export default async function SerialLandingPage({ params }: Props) {
    const resolvedParams = await params;
    const data = await getSerialData(resolvedParams.slug);

    if (!data) {
        notFound();
    }

    const { serial, ongData, stages, leaderboards, categories } = data;

    // Adaptamos el mapeo para que coincida exactamente con lo que espera el componente (interface Sponsor local)
    const transformedSponsors = serial.sponsors?.map((url, i) => ({
        name: `Patrocinador ${i+1}`,
        url: url
    }));

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            <HeroBannerSerial 
                serial={serial} 
                ongName={ongData?.organizationName}
                ongLogo={ongData?.logoUrl}
                startDate={stages[0]?.date}
                endDate={stages[stages.length - 1]?.date}
            />

            {transformedSponsors && transformedSponsors.length > 0 && (
                <div className="bg-white border-b py-8">
                    <div className="container mx-auto px-4 max-w-5xl">
                         <h3 className="text-sm font-bold text-center text-muted-foreground uppercase tracking-widest mb-6">
                            Patrocinadores Oficiales
                        </h3>
                        <SponsorsCarousel sponsors={transformedSponsors} />
                    </div>
                </div>
            )}

            <div className="container mx-auto px-4 py-12 max-w-5xl">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column - Detalle y Leaderboard */}
                    <div className="lg:col-span-2 space-y-8">
                        <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-bold mb-4">Sobre el Campeonato</h2>
                            <div className="prose prose-orange max-w-none text-gray-600 whitespace-pre-wrap">
                                {serial.description}
                            </div>
                        </section>

                        <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100" id="leaderboard">
                             <h2 className="text-2xl font-bold mb-2">Leaderboard Global</h2>
                             <p className="text-muted-foreground text-sm mb-6">
                                Las posiciones se calculan automáticamente tras procesar los resultados oficiales de cada etapa.
                             </p>
                             
                             <SerialLeaderboardView leaderboards={leaderboards} categories={categories} />
                        </section>
                    </div>

                    {/* Right Column - Etapas (Feed) */}
                    <div className="space-y-6">
                         <div className="sticky top-24">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                Fechas Oficiales
                                <span className="bg-orange-100 text-orange-700 text-xs py-1 px-2 rounded-full">
                                    {stages.length}
                                </span>
                            </h3>
                            <StagesFeed stages={stages} />
                         </div>
                    </div>

                </div>
            </div>
        </main>
    );
}
