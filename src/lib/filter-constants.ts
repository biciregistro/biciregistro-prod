// Constants for Dashboard Filters to avoid expensive DB reads
import { BIKE_MODALITIES_OPTIONS, MODALITY_MAPPING } from '@/lib/bike-types';
import { bikeBrands } from '@/lib/bike-brands';

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
  { value: 'México', label: 'Estado de México' }, // Ajustado el value para que coincida con la BD (México)
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

// Reemplazado array hardcodeado para usar el catálogo global y evitar discrepancias.
export const BIKE_BRANDS = bikeBrands.map((brand) => ({
  value: brand,
  label: brand
}));

// Re-exporting from the single source of truth
export const MODALITIES = BIKE_MODALITIES_OPTIONS;
export const MODALITY_LEGACY_MAPPING = MODALITY_MAPPING;

export const GENDERS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'otro', label: 'Otro' },
];
