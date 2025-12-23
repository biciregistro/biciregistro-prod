'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getReverseGeocoding } from '@/lib/actions/bike-actions';
// Imports para la barra de búsqueda
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';

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
// Sobrescribimos la searchUrl para que apunte a nuestra API local
class ProxyProvider extends OpenStreetMapProvider {
  constructor(options = {}) {
    super(options);
    // @ts-ignore - Sobrescribimos propiedad interna para redirigir tráfico
    this.searchUrl = '/api/geosearch';
  }

  getSearchUrl(query: string) {
    return `${this.searchUrl}?query=${encodeURIComponent(query)}`;
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

    // Limpieza defensiva del contenedor
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

        // --- Integración de Barra de Búsqueda con Proxy ---
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
        // --- Fin de Integración ---

        map.on('click', (e: L.LeafletMouseEvent) => {
            marker.setLatLng(e.latlng);
            setCurrentPos(e.latlng);
        });

        map.locate({ setView: false, maxZoom: 16 });
        
        const onLocationFound = (e: L.LocationEvent) => {
            if (!mapInstanceRef.current) return;
            if (mapInstanceRef.current !== map) return;
            if (!map.getContainer()) return;

            marker.setLatLng(e.latlng);
            setCurrentPos(e.latlng);

            requestAnimationFrame(() => {
                if (mapInstanceRef.current && map.getContainer()) {
                    try {
                        map.setView(e.latlng, 16, { animate: false });
                    } catch (err) {
                        console.warn("Error setting view safely:", err);
                    }
                }
            });
        };

        map.on('locationfound', onLocationFound);

      } catch (error: any) {
          console.error("LocationPickerMap: Error inicializando mapa:", error);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('geosearch/showlocation');
        mapInstanceRef.current.off('locationfound');
        mapInstanceRef.current.stopLocate();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  const handleConfirmLocation = async () => {
    setIsLoading(true);
    try {
      const result = await getReverseGeocoding(currentPos.lat, currentPos.lng);
      if (!result.success || !result.data) {
          throw new Error(result.error || 'Error desconocido al obtener dirección');
      }
      const data = result.data;
      const locationData: LocationData = {
        lat: currentPos.lat,
        lng: currentPos.lng,
        address: data.address,
        display_name: data.display_name,
      };
      onLocationSelect(locationData);
    } catch (error) {
      console.error("Error Geocoding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div 
        ref={mapContainerRef} 
        style={{ height: '400px', width: '100%', zIndex: 0 }} 
      />
      
      <div className="flex flex-col sm:flex-row gap-2">
        <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            disabled={isLoading}
        >
            Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirmLocation}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          disabled={isLoading}
        >
          {isLoading ? 'Confirmando...' : 'Confirmar Ubicación'}
        </button>
      </div>
    </div>
  );
}
