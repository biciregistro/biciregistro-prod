'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { COUNTRIES, STATES_MX, BIKE_BRANDS, MODALITIES, GENDERS } from '@/lib/filter-constants';

export function DashboardFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
    // If country changes to something other than Mexico, clear state
    if (key === 'country' && value !== 'México') {
        const params = new URLSearchParams(searchParams.toString());
        params.set('country', value || '');
        params.delete('state');
        router.push(`?${params.toString()}`, { scroll: false });
        return;
    }

    router.push(`?${createQueryString(key, value)}`, { scroll: false });
  };

  const clearFilters = () => {
    router.push('?tab=stats', { scroll: false });
  };

  // Current values
  const currentCountry = searchParams.get('country') || '';
  const currentState = searchParams.get('state') || '';
  const currentBrand = searchParams.get('brand') || '';
  const currentModality = searchParams.get('modality') || '';
  const currentGender = searchParams.get('gender') || '';

  const hasActiveFilters = currentCountry || currentState || currentBrand || currentModality || currentGender;

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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

        {/* Brand Filter - Switched to Select to avoid missing 'cmdk' dependency */}
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
