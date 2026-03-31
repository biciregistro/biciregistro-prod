'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getReverseGeocoding } from '@/lib/actions/bike-actions';
// Imports para la barra de búsqueda
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import { Info, Search, MousePointer2, ZoomIn, CheckCircle2 } from 'lucide-react';

// SOLUCIÓN DEFINITIVA PARA ICONOS: Usar CDN
const DefaultIcon = L.icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// CLASE CUSTOM PROVIDER PARA USAR NUESTRO PROXY
class ProxyProvider extends OpenStreetMapProvider {
  constructor(options = {}) {
    super(options);
    // @ts-ignore
    this.searchUrl = '/api/geosearch';
  }
}

type NominatimAddress = {
  road?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
};

export type LocationData = {
  lat: number;
  lng: number;
  address: NominatimAddress;
  display_name: string;
};

interface LocationPickerMapProps {
  onLocationSelect: (data: LocationData) => void;
  onClose: () => void;
}

export default function LocationPickerMap({ onLocationSelect, onClose }: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [currentPos, setCurrentPos] = useState<L.LatLng>(new L.LatLng(19.4326, -99.1332));

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const container = mapContainerRef.current as any;
    if (container._leaflet_id) {
        container._leaflet_id = null;
        container.innerHTML = '';
    }

    if (!mapInstanceRef.current) {
      try {
        const map = L.map(mapContainerRef.current).setView([19.4326, -99.1332], 13);
        mapInstanceRef.current = map;
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const marker = L.marker([19.4326, -99.1332], { icon: DefaultIcon }).addTo(map);
        markerRef.current = marker;

        const provider = new ProxyProvider();
        const searchControl = GeoSearchControl({
          provider: provider,
          style: 'bar',
          showMarker: false, 
          autoClose: true,
          keepResult: true,
          searchLabel: 'Buscar ubicación...',
        });
        map.addControl(searchControl);
        
        map.on('geosearch/showlocation', (result: any) => {
            const pos = new L.LatLng(result.location.y, result.location.x);
            map.setView(pos, 16, { animate: false });
            marker.setLatLng(pos);
            setCurrentPos(pos);
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
            marker.setLatLng(e.latlng);
            setCurrentPos(e.latlng);
        });

        map.locate({ setView: false, maxZoom: 16 });
        
        const onLocationFound = (e: L.LocationEvent) => {
            if (!mapInstanceRef.current) return;
            marker.setLatLng(e.latlng);
            setCurrentPos(e.latlng);
            try {
                map.setView(e.latlng, 16, { animate: false });
            } catch (err) {
                console.warn("Error setting view safely:", err);
            }
        };

        map.on('locationfound', onLocationFound);

      } catch (error: any) {
          console.error("LocationPickerMap: Error inicializando mapa:", error);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  const handleConfirmLocation = async () => {
    setIsLoading(true);
    try {
      let addressData = { 
          display_name: `Ubicación seleccionada (Lat: ${currentPos.lat.toFixed(4)}, Lng: ${currentPos.lng.toFixed(4)})`, 
          address: {} 
      };
      
      const result = await getReverseGeocoding(currentPos.lat, currentPos.lng);
      
      if (result.success && result.data) {
          addressData = result.data;
      }

      const locationData: LocationData = {
        lat: currentPos.lat,
        lng: currentPos.lng,
        address: addressData.address,
        display_name: addressData.display_name,
      };
      onLocationSelect(locationData);
    } catch (error) {
      console.error("Critical Error in Location Confirmation:", error);
      onLocationSelect({
          lat: currentPos.lat,
          lng: currentPos.lng,
          address: {},
          display_name: `Ubicación (Lat: ${currentPos.lat.toFixed(4)}, Lng: ${currentPos.lng.toFixed(4)})`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Panel de Instrucciones */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 md:p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-primary">
          <Info className="w-5 h-5 shrink-0" />
          <h3 className="font-bold text-sm md:text-base uppercase tracking-tight">Instrucciones del Mapa</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-1.5 rounded-lg shrink-0 mt-0.5">
              <Search className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-[12px] md:text-xs text-gray-700 leading-relaxed">
              <span className="font-bold text-gray-900">Encuentra el lugar:</span> Usa la barra de búsqueda o desplaza el mapa.
            </p>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-1.5 rounded-lg shrink-0 mt-0.5">
              <ZoomIn className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-[12px] md:text-xs text-gray-700 leading-relaxed">
              <span className="font-bold text-gray-900">Aumenta precisión:</span> Haz zoom (pellizca la pantalla) para ver calles a detalle.
            </p>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-1.5 rounded-lg shrink-0 mt-0.5">
              <MousePointer2 className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-[12px] md:text-xs text-gray-700 leading-relaxed">
              <span className="font-bold text-gray-900">Marca el punto:</span> Toca el mapa sobre el lugar exacto del robo (verás el pin azul).
            </p>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-1.5 rounded-lg shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-[12px] md:text-xs text-gray-700 leading-relaxed">
              <span className="font-bold text-gray-900">Finaliza:</span> Al terminar, presiona el botón <span className="font-bold text-primary">Confirmar Ubicación</span>.
            </p>
          </div>
        </div>
      </div>

      <div 
        ref={mapContainerRef} 
        className="rounded-xl border border-gray-200 overflow-hidden shadow-inner"
        style={{ height: '350px', width: '100%', zIndex: 0 }} 
      />
      
      <div className="flex flex-col sm:flex-row gap-3">
        <button
            type="button"
            onClick={onClose}
            className="w-full h-12 px-6 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            disabled={isLoading}
        >
            Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirmLocation}
          className="w-full h-12 px-6 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-blue-300 transition-all shadow-lg shadow-blue-200"
          disabled={isLoading}
        >
          {isLoading ? 'Confirmando...' : 'Confirmar Ubicación'}
        </button>
      </div>
    </div>
  );
}
