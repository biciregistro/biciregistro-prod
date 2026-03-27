'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

// --- PATCH LEAFLET PARA REACT 18 STRICT MODE ---
if (typeof window !== 'undefined') {
    const LMap = L.Map as any;
    if (!LMap.prototype._isPatched) {
        const originalInitContainer = LMap.prototype._initContainer;
        LMap.prototype._initContainer = function (id: any) {
            const container = typeof id === 'string' ? document.getElementById(id) : id;
            if (container && (container as any)._leaflet_id) {
                (container as any)._leaflet_id = null;
            }
            originalInitContainer.call(this, id);
        };
        LMap.prototype._isPatched = true;
    }
}
// ----------------------------------------------

const DefaultIcon = L.icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const VictimIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

type MapDataPoint = {
    id: string;
    lat: number | null;
    lng: number | null;
    state: string;
    city: string;
    date: string | null;
    brand: string;
    modality: string;
    victimOrigin: string;
};

interface SecurityMapProps {
    data: MapDataPoint[];
}

const HeatmapLayer = ({ points }: { points: [number, number, number][] }) => {
    const map = useMap();
    const layerRef = useRef<any>(null);

    const pointsHash = points.map(p => `${p[0]},${p[1]}`).join('|');

    useEffect(() => {
        if (!map) return;
        let mounted = true;
        const initHeatmap = async () => {
            try {
                // @ts-ignore
                await import('leaflet.heat'); 
                if (mounted && typeof (L as any).heatLayer !== 'undefined') {
                    if (layerRef.current) {
                        map.removeLayer(layerRef.current);
                    }
                    // @ts-ignore
                    layerRef.current = (L as any).heatLayer(points, {
                        radius: 25, blur: 15, maxZoom: 17,
                    }).addTo(map);
                }
            } catch (error) {
                console.warn("No se pudo cargar leaflet.heat:", error);
            }
        };
        initHeatmap();
        return () => {
            mounted = false;
            if (map && layerRef.current) {
                map.removeLayer(layerRef.current);
            }
        };
    }, [pointsHash, map]); 
    return null;
};

const MapBoundsFitter = ({ points }: { points: MapDataPoint[] }) => {
    const map = useMap();
    const pointsHash = points.map(p => `${p.lat},${p.lng}`).join('|');

    useEffect(() => {
        if (points.length === 0 || !map) return;
        try {
            const bounds = L.latLngBounds(points.map(p => [p.lat!, p.lng!]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } catch (e) {
            console.error("Error fitting bounds:", e);
        }
    }, [pointsHash, map]); 
    return null;
};

export default function SecurityMap({ data }: SecurityMapProps) {
    const [activeTab, setActiveTab] = useState('incidents');
    const [isMounted, setIsMounted] = useState(false);
    
    // Referencia para capturar la instancia del mapa y poder controlarla desde afuera
    const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

    useEffect(() => {
        setIsMounted(true);
        return () => setIsMounted(false);
    }, []);

    const validIncidentPoints = data.filter(d => d.lat !== null && d.lng !== null);
    const heatPoints: [number, number, number][] = validIncidentPoints.map(p => [p.lat!, p.lng!, 1]);

    const centerPos: [number, number] = validIncidentPoints.length > 0 
        ? [validIncidentPoints[0].lat!, validIncidentPoints[0].lng!] 
        : [19.4326, -99.1332];

    if (!isMounted) {
        return (
            <Card className="col-span-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                        <CardTitle className="text-xl">Mapa Analítico de Incidentes</CardTitle>
                        <p className="text-sm text-muted-foreground">Cargando datos espaciales...</p>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[500px] w-full bg-muted animate-pulse rounded-md" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-full z-0 relative">
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <div className="space-y-1">
                    <CardTitle className="text-xl">Mapa Analítico de Incidentes</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Análisis geoespacial para iniciativas de Smart Cities
                    </p>
                </div>
            </CardHeader>
            <CardContent className="relative z-0">
                <Tabs defaultValue="incidents" className="w-full" onValueChange={setActiveTab}>
                    <div className="flex justify-end mb-4 relative z-10">
                        <TabsList>
                            <TabsTrigger value="incidents">Puntos de Robo</TabsTrigger>
                            <TabsTrigger value="heatmap">Mapa de Calor</TabsTrigger>
                            <TabsTrigger value="victims">Procedencia</TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Contenedor principal con touch-none para bloquear la interferencia del navegador con los gestos */}
                    <div className="border rounded-md relative touch-none bg-muted/20" style={{ height: '500px', width: '100%', zIndex: 1 }}>
                        
                        {/* Indicador Flotante (Sin Datos) */}
                        {validIncidentPoints.length === 0 && (
                            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-[1000] bg-background/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border text-sm text-muted-foreground flex items-center gap-3">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                </span>
                                No hay incidentes con geolocalización en este filtro
                            </div>
                        )}

                        {/* NAVEGADOR MANUAL DE POSICIÓN (D-PAD) */}
                        {mapInstance && (
                            <div className="absolute bottom-6 right-4 z-[1000] flex flex-col items-center gap-1 p-2 rounded-xl shadow-xl border bg-background/90 backdrop-blur-md">
                                <span className="text-[9px] font-bold text-muted-foreground mb-1 tracking-widest uppercase">Mover</span>
                                <button 
                                    className="h-8 w-8 bg-secondary/80 hover:bg-primary hover:text-primary-foreground text-secondary-foreground rounded flex items-center justify-center transition-colors shadow-sm" 
                                    onClick={(e) => { e.preventDefault(); mapInstance.panBy([0, -150]); }}
                                    title="Mover Arriba"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                </button>
                                <div className="flex gap-1">
                                    <button 
                                        className="h-8 w-8 bg-secondary/80 hover:bg-primary hover:text-primary-foreground text-secondary-foreground rounded flex items-center justify-center transition-colors shadow-sm" 
                                        onClick={(e) => { e.preventDefault(); mapInstance.panBy([-150, 0]); }}
                                        title="Mover Izquierda"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                    </button>
                                    <button 
                                        className="h-8 w-8 bg-secondary/80 hover:bg-primary hover:text-primary-foreground text-secondary-foreground rounded flex items-center justify-center transition-colors shadow-sm" 
                                        onClick={(e) => { e.preventDefault(); mapInstance.panBy([150, 0]); }}
                                        title="Mover Derecha"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                    </button>
                                </div>
                                <button 
                                    className="h-8 w-8 bg-secondary/80 hover:bg-primary hover:text-primary-foreground text-secondary-foreground rounded flex items-center justify-center transition-colors shadow-sm" 
                                    onClick={(e) => { e.preventDefault(); mapInstance.panBy([0, 150]); }}
                                    title="Mover Abajo"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                </button>
                            </div>
                        )}

                        <MapContainer 
                            // @ts-ignore - ref está soportado en react-leaflet v4 para obtener la instancia
                            ref={setMapInstance}
                            center={centerPos} 
                            zoom={11} 
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={false}
                            dragging={true}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                                url='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                            />

                            {activeTab !== 'heatmap' && validIncidentPoints.length > 0 && (
                                <MapBoundsFitter points={validIncidentPoints} />
                            )}

                            {activeTab === 'incidents' && (
                                <MarkerClusterGroup chunkedLoading>
                                    {validIncidentPoints.map(point => (
                                        <Marker 
                                            key={`incident-${point.id}-${point.lat}-${point.lng}`} 
                                            position={[point.lat!, point.lng!]}
                                            icon={DefaultIcon}
                                        >
                                            <Popup>
                                                <div className="space-y-2">
                                                    <p className="font-semibold">{point.brand} - {point.modality}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Ubicación: {point.city}, {point.state}
                                                    </p>
                                                    <p className="text-sm">Fecha: {point.date || 'Desconocida'}</p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MarkerClusterGroup>
                            )}

                            {activeTab === 'heatmap' && heatPoints.length > 0 && (
                                <HeatmapLayer points={heatPoints} />
                            )}

                            {activeTab === 'victims' && (
                                <MarkerClusterGroup chunkedLoading>
                                    {validIncidentPoints.map(point => (
                                        <Marker 
                                            key={`victim-${point.id}-${point.lat}-${point.lng}`} 
                                            position={[point.lat!, point.lng!]}
                                            icon={VictimIcon}
                                        >
                                            <Popup>
                                                <div className="space-y-2">
                                                    <Badge variant="destructive">Víctima</Badge>
                                                    <p className="text-sm mt-2">
                                                        <span className="font-semibold">Residencia del ciclista:</span><br/>
                                                        {point.victimOrigin}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        *Robada en {point.city}
                                                    </p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MarkerClusterGroup>
                            )}
                        </MapContainer>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
}
