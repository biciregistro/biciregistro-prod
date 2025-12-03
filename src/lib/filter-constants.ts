// Constants for Dashboard Filters to avoid expensive DB reads
import { BIKE_MODALITIES_OPTIONS, MODALITY_MAPPING } from '@/lib/bike-types';

export const COUNTRIES = [
  { value: 'México', label: 'México' },
  // Add more countries as the platform expands
];

export const STATES_MX = [
  { value: 'Aguascalientes', label: 'Aguascalientes' },
  { value: 'Baja California', label: 'Baja California' },
  { value: 'Baja California Sur', label: 'Baja California Sur' },
  { value: 'Campeche', label: 'Campeche' },
  { value: 'Chiapas', label: 'Chiapas' },
  { value: 'Chihuahua', label: 'Chihuahua' },
  { value: 'Ciudad de México', label: 'Ciudad de México' },
  { value: 'Coahuila', label: 'Coahuila' },
  { value: 'Colima', label: 'Colima' },
  { value: 'Durango', label: 'Durango' },
  { value: 'Estado de México', label: 'Estado de México' },
  { value: 'Guanajuato', label: 'Guanajuato' },
  { value: 'Guerrero', label: 'Guerrero' },
  { value: 'Hidalgo', label: 'Hidalgo' },
  { value: 'Jalisco', label: 'Jalisco' },
  { value: 'Michoacán', label: 'Michoacán' },
  { value: 'Morelos', label: 'Morelos' },
  { value: 'Nayarit', label: 'Nayarit' },
  { value: 'Nuevo León', label: 'Nuevo León' },
  { value: 'Oaxaca', label: 'Oaxaca' },
  { value: 'Puebla', label: 'Puebla' },
  { value: 'Querétaro', label: 'Querétaro' },
  { value: 'Quintana Roo', label: 'Quintana Roo' },
  { value: 'San Luis Potosí', label: 'San Luis Potosí' },
  { value: 'Sinaloa', label: 'Sinaloa' },
  { value: 'Sonora', label: 'Sonora' },
  { value: 'Tabasco', label: 'Tabasco' },
  { value: 'Tamaulipas', label: 'Tamaulipas' },
  { value: 'Tlaxcala', label: 'Tlaxcala' },
  { value: 'Veracruz', label: 'Veracruz' },
  { value: 'Yucatán', label: 'Yucatán' },
  { value: 'Zacatecas', label: 'Zacatecas' },
];

export const BIKE_BRANDS = [
  { value: 'Alubike', label: 'Alubike' },
  { value: 'Benotto', label: 'Benotto' },
  { value: 'Bianchi', label: 'Bianchi' },
  { value: 'BMC', label: 'BMC' },
  { value: 'Cannondale', label: 'Cannondale' },
  { value: 'Canyon', label: 'Canyon' },
  { value: 'Cervélo', label: 'Cervélo' },
  { value: 'Colnago', label: 'Colnago' },
  { value: 'Cube', label: 'Cube' },
  { value: 'Giant', label: 'Giant' },
  { value: 'Merida', label: 'Merida' },
  { value: 'Orbea', label: 'Orbea' },
  { value: 'Pinarello', label: 'Pinarello' },
  { value: 'Santa Cruz', label: 'Santa Cruz' },
  { value: 'Scott', label: 'Scott' },
  { value: 'Specialized', label: 'Specialized' },
  { value: 'Trek', label: 'Trek' },
  { value: 'Turbo', label: 'Turbo' },
  { value: 'Veloci', label: 'Veloci' },
  { value: 'Yeti', label: 'Yeti' },
  { value: 'Otra', label: 'Otra' },
];

// Re-exporting from the single source of truth
export const MODALITIES = BIKE_MODALITIES_OPTIONS;
export const MODALITY_LEGACY_MAPPING = MODALITY_MAPPING;

export const GENDERS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'otro', label: 'Otro' },
];
