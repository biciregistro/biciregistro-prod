'use client';

import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';

// Arreglo para el icono por defecto de Leaflet que se rompe con Webpack
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl.src,
  iconUrl: iconUrl.src,
  shadowUrl: shadowUrl.src,
});

// Tipos para la respuesta de la API de Nominatim
type NominatimAddress = {
  road?: string;
  suburb?: string;
  city?: string;
  town?: string; // Added
  village?: string; // Added
  hamlet?: string; // Added for completeness
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

// Componente para centrar el mapa en la ubicación del usuario
function CenterMapToUserLocation({ onInitialLocationFound }: { onInitialLocationFound: (pos: L.LatLng) => void }) {
  const map = useMap();
  
  useEffect(() => {
    map.locate({ setView: true, maxZoom: 16 });
    map.on('locationfound', (e) => {
      onInitialLocationFound(e.latlng);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

// Componente para manejar los clics y el marcador
function MapClickHandler({ initialPosition, onLocationChange }: { initialPosition: L.LatLng, onLocationChange: (pos: L.LatLng) => void }) {
  const [position, setPosition] = useState<L.LatLng>(initialPosition);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationChange(e.latlng);
    },
  });

  return <Marker position={position} />;
}


export default function LocationPickerMap({ onLocationSelect, onClose }: LocationPickerMapProps) {
  const [markerPosition, setMarkerPosition] = useState<L.LatLng>(new L.LatLng(19.4326, -99.1332)); // Default a CDMX
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Asegura que el componente solo se renderice en el cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLocationChange = (pos: L.LatLng) => {
    setMarkerPosition(pos);
  };

  const handleConfirmLocation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${markerPosition.lat}&lon=${markerPosition.lng}&addressdetails=1`
      );
      if (!response.ok) {
        throw new Error('No se pudo obtener la dirección.');
      }
      const data = await response.json();
      
      const locationData: LocationData = {
        lat: markerPosition.lat,
        lng: markerPosition.lng,
        address: data.address,
        display_name: data.display_name,
      };

      onLocationSelect(locationData);

    } catch (error) {
      console.error("Error en Reverse Geocoding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) {
      return <div className="h-[400px] w-full bg-muted animate-pulse flex items-center justify-center">Cargando mapa...</div>;
  }

  return (
    <div className="space-y-4">
      <div style={{ height: '400px', width: '100%' }}>
        {/* La key asegura que si isMounted cambia (o cualquier state padre), el mapa se reinicie limpiamente */}
        <MapContainer 
            key={isMounted ? "mounted-map" : "loading-map"}
            center={markerPosition} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <CenterMapToUserLocation onInitialLocationFound={setMarkerPosition} />
          <MapClickHandler initialPosition={markerPosition} onLocationChange={handleLocationChange} />
        </MapContainer>
      </div>
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
