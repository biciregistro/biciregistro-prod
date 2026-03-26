'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

import { COUNTRIES, STATES_MX, BIKE_BRANDS, MODALITIES, GENDERS } from '@/lib/filter-constants';
import { getCities } from '@/lib/cities'; // Importar utilidad de ciudades

export function DashboardFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local state for free-text city input (fallback)
  const [cityInput, setCityInput] = useState(searchParams.get('city') || '');

  // Helper to update URL params
  const createQueryString = useCallback(
    (name: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleFilterChange = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Dependency Logic
    if (key === 'country' && value !== 'México') {
        params.delete('state');
        params.delete('city');
        setCityInput('');
    }

    if (key === 'state') {
        params.delete('city');
        setCityInput('');
    }

    router.push(`?${params.toString()}`, { scroll: false });
  };

  const clearFilters = () => {
    setCityInput('');
    router.push('?tab=stats', { scroll: false });
  };

  // Debounce effect for city free-text input (only used if not a known state)
  // We need to be careful to ONLY trigger this if the input was actually typed by the user,
  // not when it's just reacting to a state clear.
  useEffect(() => {
    const timer = setTimeout(() => {
        const currentUrlCity = searchParams.get('city') || '';
        // Only push to router if the local state differs from URL AND we are not in a cleared state
        // The condition `cityInput !== '' || currentUrlCity !== ''` prevents infinite loops when both are empty
        if (cityInput !== currentUrlCity && (cityInput !== '' || currentUrlCity !== '')) {
            // Check if we are in dropdown mode. If so, ignore the text input debounce to avoid conflicts
            const countryForCities = searchParams.get('country') || 'México';
            const state = searchParams.get('state') || '';
            const availableCities = state ? getCities(countryForCities, state) : [];
            
            if (availableCities.length === 0) {
               handleFilterChange('city', cityInput.trim() !== '' ? cityInput.trim() : null);
            }
        }
    }, 500); 

    return () => clearTimeout(timer);
  }, [cityInput, searchParams]);


  // Current values
  const currentCountry = searchParams.get('country') || '';
  const currentState = searchParams.get('state') || '';
  const currentBrand = searchParams.get('brand') || '';
  const currentModality = searchParams.get('modality') || '';
  const currentGender = searchParams.get('gender') || '';
  const currentCity = searchParams.get('city') || '';

  const hasActiveFilters = currentCountry || currentState || currentBrand || currentModality || currentGender || currentCity;

  // Determine if we should show the dropdown or the input
  const countryForCities = currentCountry || 'México'; // Default context
  const availableCities = currentState ? getCities(countryForCities, currentState) : [];
  const showCityDropdown = availableCities.length > 0;

  return (
    <div className="flex flex-col space-y-4 mb-6 p-4 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Filtros Globales</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 lg:px-3">
            <X className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Country Filter */}
        <Select
          value={currentCountry}
          onValueChange={(val) => handleFilterChange('country', val === 'all' ? null : val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="País" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los países</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* State Filter (Only if Mexico is selected or no country selected - assuming default is MX context) */}
        <Select
          value={currentState}
          onValueChange={(val) => handleFilterChange('state', val === 'all' ? null : val)}
          disabled={!!currentCountry && currentCountry !== 'México'}
        >
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {STATES_MX.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* City/Municipality Dynamic Field */}
        {showCityDropdown ? (
            <Select
              value={currentCity}
              onValueChange={(val) => handleFilterChange('city', val === 'all' ? null : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Municipio / Ciudad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los municipios</SelectItem>
                {availableCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        ) : (
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                    type="text"
                    placeholder="Municipio / Ciudad"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    className="pl-9"
                    disabled={!currentState} // Disable free text if no state is selected to enforce hierarchy
                />
            </div>
        )}

        {/* Brand Filter */}
        <Select
          value={currentBrand}
          onValueChange={(val) => handleFilterChange('brand', val === 'all' ? null : val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Marca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las marcas</SelectItem>
            {BIKE_BRANDS.map((b) => (
              <SelectItem key={b.value} value={b.value}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Modality Filter */}
        <Select
          value={currentModality}
          onValueChange={(val) => handleFilterChange('modality', val === 'all' ? null : val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Modalidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las modalidades</SelectItem>
            {MODALITIES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Gender Filter */}
        <Select
          value={currentGender}
          onValueChange={(val) => handleFilterChange('gender', val === 'all' ? null : val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Género" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {GENDERS.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
