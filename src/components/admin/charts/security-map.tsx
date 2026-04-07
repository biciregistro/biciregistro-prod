'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { MapPin, Target, CalendarDays, ShieldAlert, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react';
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

// Componente para la "Marca de Agua" (Panel de Contexto)
const MapWatermark = ({ count, date }: { count: number, date: string }) => (
    <div className="absolute bottom-4 left-4 z-[1000] bg-background/85 backdrop-blur-md border border-border/50 shadow-lg rounded-lg p-4 pointer-events-none select-none max-w-[280px]">
        <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <h4 className="font-bold text-sm tracking-tight leading-none">Inteligencia Geoespacial</h4>
        </div>
        <div className="space-y-1.5 mt-3">
            <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Incidentes Mapeados:</span>
                <span className="font-bold text-foreground bg-primary/10 px-2 py-0.5 rounded-full">{count}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground">Fecha Reporte:</span>
                <span className="text-foreground">{date}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] mt-2 pt-2 border-t border-border/40">
                <span className="text-muted-foreground opacity-70">Fuente: Base de Datos BiciRegistro</span>
            </div>
        </div>
    </div>
);

export default function SecurityMap({ data }: SecurityMapProps) {
    const [activeTab, setActiveTab] = useState('incidents');
    const [isMounted, setIsMounted] = useState(false);
    const [currentDate, setCurrentDate] = useState('');
    const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

    useEffect(() => {
        setIsMounted(true);
        // Formatear fecha para la marca de agua
        setCurrentDate(new Intl.DateTimeFormat('es-MX', { 
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }).format(new Date()));
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
                        <p className="text-sm text-muted-foreground">Cargando motor geoespacial...</p>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[550px] w-full bg-muted animate-pulse rounded-xl" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-full z-0 relative overflow-hidden border-border/60 shadow-sm">
            <Tabs defaultValue="incidents" className="w-full" onValueChange={setActiveTab}>
                {/* CORRECCIÓN 1: Pestañas en el encabezado blanco */}
                <CardHeader className="flex flex-row items-center justify-between pb-4 relative z-10 bg-card border-b">
                    <div className="space-y-1">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            Mapa Analítico de Incidentes
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Herramienta de análisis geoespacial para mapeo de zonas de riesgo.
                        </p>
                    </div>
                    <div>
                        <TabsList className="h-9">
                            <TabsTrigger value="incidents" className="text-xs px-3">Puntos de Robo</TabsTrigger>
                            <TabsTrigger value="heatmap" className="text-xs px-3">Densidad (Calor)</TabsTrigger>
                            <TabsTrigger value="victims" className="text-xs px-3">Origen Ciclista</TabsTrigger>
                        </TabsList>
                    </div>
                </CardHeader>

                <CardContent className="relative z-0 p-0">
                    
                    {/* CONTROLES DE ACCESIBILIDAD: D-Pad y Zoom discretos flotando directamente sobre el mapa */}
                    {mapInstance && (
                        <div className="absolute top-4 right-4 z-[1000] flex flex-col items-center gap-4 opacity-60 hover:opacity-100 transition-opacity">
                            
                            {/* D-Pad de Navegación */}
                            <div className="flex flex-col items-center gap-0.5">
                                <button 
                                    className="h-7 w-9 bg-background/80 hover:bg-background hover:text-primary text-foreground rounded-sm flex items-center justify-center shadow-sm border border-border/40 backdrop-blur-sm transition-all" 
                                    onClick={(e) => { e.preventDefault(); mapInstance.panBy([0, -150]); }}
                                    title="Mover Arriba"
                                    aria-label="Mover mapa hacia arriba"
                                >
                                    <ChevronUp className="h-5 w-5" />
                                </button>
                                <div className="flex gap-0.5">
                                    <button 
                                        className="h-8 w-8 bg-background/80 hover:bg-background hover:text-primary text-foreground rounded-sm flex items-center justify-center shadow-sm border border-border/40 backdrop-blur-sm transition-all" 
                                        onClick={(e) => { e.preventDefault(); mapInstance.panBy([-150, 0]); }}
                                        title="Mover Izquierda"
                                        aria-label="Mover mapa hacia la izquierda"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <div className="h-8 w-8 flex items-center justify-center opacity-30"><Target className="h-3 w-3" /></div>
                                    <button 
                                        className="h-8 w-8 bg-background/80 hover:bg-background hover:text-primary text-foreground rounded-sm flex items-center justify-center shadow-sm border border-border/40 backdrop-blur-sm transition-all" 
                                        onClick={(e) => { e.preventDefault(); mapInstance.panBy([150, 0]); }}
                                        title="Mover Derecha"
                                        aria-label="Mover mapa hacia la derecha"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </div>
                                <button 
                                    className="h-7 w-9 bg-background/80 hover:bg-background hover:text-primary text-foreground rounded-sm flex items-center justify-center shadow-sm border border-border/40 backdrop-blur-sm transition-all" 
                                    onClick={(e) => { e.preventDefault(); mapInstance.panBy([0, 150]); }}
                                    title="Mover Abajo"
                                    aria-label="Mover mapa hacia abajo"
                                >
                                    <ChevronDown className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Controles de Zoom (Sutiles y coherentes) */}
                            <div className="flex flex-col rounded-md shadow-sm border border-border/40 overflow-hidden bg-background/80 backdrop-blur-sm">
                                <button 
                                    className="h-8 w-9 hover:bg-background hover:text-primary text-foreground flex items-center justify-center border-b border-border/40 transition-all" 
                                    onClick={(e) => { e.preventDefault(); mapInstance.zoomIn(); }}
                                    title="Acercar (Zoom In)"
                                    aria-label="Acercar mapa"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                                <button 
                                    className="h-8 w-9 hover:bg-background hover:text-primary text-foreground flex items-center justify-center transition-all" 
                                    onClick={(e) => { e.preventDefault(); mapInstance.zoomOut(); }}
                                    title="Alejar (Zoom Out)"
                                    aria-label="Alejar mapa"
                                >
                                    <Minus className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Contenedor principal del mapa. CORRECCIÓN 3: Quitado touch-none para devolver el paneo de ratón */}
                    <div className="relative bg-muted/20" style={{ height: '550px', width: '100%', zIndex: 1 }}>
                        
                        {/* Indicador Flotante (Sin Datos) */}
                        {validIncidentPoints.length === 0 && (
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] bg-background/95 backdrop-blur-md px-6 py-4 rounded-xl shadow-xl border text-sm text-muted-foreground flex flex-col items-center gap-3 text-center">
                                <span className="relative flex h-8 w-8 mb-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-20"></span>
                                    <MapPin className="relative inline-flex rounded-full h-8 w-8 text-primary opacity-50" />
                                </span>
                                <span className="font-semibold text-foreground">Sin registros geolocalizados</span>
                                <span className="text-xs max-w-[200px]">No se encontraron coordenadas exactas para los incidentes en el filtro actual.</span>
                            </div>
                        )}

                        {/* MARCA DE AGUA PARA CAPTURAS DE PANTALLA */}
                        {validIncidentPoints.length > 0 && (
                            <MapWatermark count={validIncidentPoints.length} date={currentDate} />
                        )}

                        <MapContainer 
                            // @ts-ignore
                            ref={setMapInstance}
                            center={centerPos} 
                            zoom={11} 
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={false}
                            dragging={true}
                        >
                            {/* Base Map (Carto Light/Voyager - Clean for analytics) */}
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
                                            <Popup className="custom-leaflet-popup">
                                                <div className="flex flex-col gap-2 min-w-[200px]">
                                                    <div className="flex items-start justify-between border-b pb-2 mb-1">
                                                        <div>
                                                            <span className="font-bold text-sm block leading-tight text-foreground">{point.brand}</span>
                                                            <span className="text-xs text-muted-foreground uppercase tracking-wider">{point.modality}</span>
                                                        </div>
                                                        <Badge variant="destructive" className="text-[10px] h-5">Robo</Badge>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <MapPin className="h-3 w-3 shrink-0" />
                                                        <span className="leading-tight">{point.city}, {point.state}</span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <CalendarDays className="h-3 w-3 shrink-0" />
                                                        <span>{point.date || 'Fecha no especificada'}</span>
                                                    </div>
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
                                            <Popup className="custom-leaflet-popup">
                                                <div className="flex flex-col gap-2 min-w-[200px]">
                                                    <div className="border-b pb-2 mb-1">
                                                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-200">
                                                            Punto de Origen
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="text-sm">
                                                        <span className="font-semibold text-foreground block mb-1">Residencia del Propietario:</span>
                                                        <div className="flex items-start gap-2 text-muted-foreground bg-muted/50 p-2 rounded-md">
                                                            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                            <span className="leading-tight">{point.victimOrigin}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-2 pt-2 border-t text-[11px] text-muted-foreground italic">
                                                        * Incidente registrado en {point.city}
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MarkerClusterGroup>
                            )}
                        </MapContainer>
                    </div>
                </CardContent>
            </Tabs>
            
            {/* CSS Global inyectado */}
            <style jsx global>{`
                /* Estilos de Popups */
                .custom-leaflet-popup .leaflet-popup-content-wrapper {
                    padding: 0;
                    border-radius: 0.5rem;
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
                    border: 1px solid hsl(var(--border));
                }
                .custom-leaflet-popup .leaflet-popup-content {
                    margin: 12px 14px;
                    line-height: 1.4;
                }
                .custom-leaflet-popup .leaflet-popup-tip {
                    background: hsl(var(--background));
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                }
                .leaflet-control-zoom { display: none !important; }

                /* CORRECCIÓN 4: Estilos para Marker Clusters (Agrupación) */
                .marker-cluster-small,
                .marker-cluster-medium,
                .marker-cluster-large {
                    background-color: transparent !important;
                }
                .marker-cluster div {
                    width: 36px !important;
                    height: 36px !important;
                    margin-left: 2px;
                    margin-top: 2px;
                    text-align: center;
                    border-radius: 50%;
                    font-weight: 700;
                    font-size: 13px;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3);
                    border: 3px solid white;
                    transition: transform 0.2s;
                }
                .marker-cluster:hover div {
                    transform: scale(1.1);
                }
                /* Colores según el tamaño del cluster */
                .marker-cluster-small div { background-color: hsl(var(--primary)); }
                .marker-cluster-medium div { background-color: #f59e0b; } /* Naranja/Ámbar */
                .marker-cluster-large div { background-color: hsl(var(--destructive)); }
            `}</style>
        </Card>
    );
}
