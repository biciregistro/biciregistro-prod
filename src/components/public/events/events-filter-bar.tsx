'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search, MapPin, Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { format, nextSaturday, nextSunday } from 'date-fns';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { countries } from '@/lib/countries';

// Constantes para filtros
const EVENT_TYPES = ['Rodada', 'Competencia', 'Taller', 'Conferencia'];
const MODALITIES = ['Ruta', 'MTB', 'Gravel', 'Urbano', 'Pista'];

export function EventsFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Estado local sincronizado con URL params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [country, setCountry] = useState(searchParams.get('country') || 'all');
  const [state, setState] = useState(searchParams.get('state') || 'all');
  const [eventType, setEventType] = useState(searchParams.get('eventType') || 'all');
  const [modality, setModality] = useState(searchParams.get('modality') || 'all');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');

  // Derivados
  const states = countries.find((c) => c.name === country)?.states || [];
  const activeFiltersCount = [
    country !== 'all',
    state !== 'all',
    eventType !== 'all',
    modality !== 'all',
    startDate,
    endDate
  ].filter(Boolean).length;

  // Actualizar URL
  const updateFilters = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === 'all' || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Reset pagination if exists
    params.delete('page');

    startTransition(() => {
      router.push(`/events?${params.toString()}`);
    });
  };

  // Handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search });
  };

  const handleClearFilters = () => {
    setSearch('');
    setCountry('all');
    setState('all');
    setEventType('all');
    setModality('all');
    setStartDate('');
    setEndDate('');
    router.push('/events');
  };

  const applyWeekendFilter = () => {
    const today = new Date();
    const nextSat = nextSaturday(today);
    const nextSun = nextSunday(today);
    
    const startStr = format(nextSat, 'yyyy-MM-dd');
    const endStr = format(nextSun, 'yyyy-MM-dd');

    setStartDate(startStr);
    setEndDate(endStr);
    
    updateFilters({
      startDate: startStr,
      endDate: endStr
    });
  };

  return (
    <div className="w-full space-y-4 mb-8">
      {/* Barra Principal */}
      <div className="flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Buscar por nombre, lugar..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {/* Botón Filtro Rápido Fin de Semana */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={applyWeekendFilter}
            className="whitespace-nowrap bg-white"
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
            Este fin de semana
          </Button>

          {/* Botón de Filtros Avanzados */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="whitespace-nowrap bg-white relative">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtrar Eventos</SheetTitle>
                <SheetDescription>
                  Encuentra el evento perfecto ajustando tus preferencias.
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-6 py-6">
                {/* Tipo de Evento */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Evento</label>
                  <Select 
                    value={eventType} 
                    onValueChange={(val) => {
                        setEventType(val);
                        updateFilters({ eventType: val });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {EVENT_TYPES.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Modalidad */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Modalidad</label>
                  <Select 
                    value={modality}
                    onValueChange={(val) => {
                        setModality(val);
                        updateFilters({ modality: val });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {MODALITIES.map((m: string) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ubicación */}
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> País
                    </label>
                    <Select 
                      value={country} 
                      onValueChange={(val) => {
                          setCountry(val);
                          setState('all'); // Reset state on country change
                          updateFilters({ country: val, state: 'all' });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {countries.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {country !== 'all' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-sm font-medium">Estado / Provincia</label>
                        <Select 
                          value={state}
                          onValueChange={(val) => {
                              setState(val);
                              updateFilters({ state: val });
                          }}
                        >
                        <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {states.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                        </Select>
                    </div>
                  )}
                </div>

                {/* Fechas */}
                <div className="space-y-4 border-t pt-4">
                   <label className="text-sm font-medium flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" /> Rango de Fechas
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Desde</span>
                            <Input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    updateFilters({ startDate: e.target.value });
                                }}
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Hasta</span>
                            <Input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    updateFilters({ endDate: e.target.value });
                                }}
                            />
                        </div>
                    </div>
                </div>
              </div>

              <SheetFooter className="flex-col gap-2 sm:flex-col">
                <SheetClose asChild>
                    <Button className="w-full">Ver resultados</Button>
                </SheetClose>
                <Button variant="ghost" onClick={handleClearFilters} className="w-full text-muted-foreground">
                    Limpiar todos los filtros
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          
          {/* Chips de filtros activos */}
          {activeFiltersCount > 0 && (
             <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearFilters}
                className="text-xs text-muted-foreground hover:text-destructive hidden md:flex"
             >
                <X className="mr-1 h-3 w-3" /> Limpiar
             </Button>
          )}
        </div>
      </div>
      
      {isPending && (
          <div className="h-1 w-full bg-primary/20 overflow-hidden rounded-full mt-2">
              <div className="h-full bg-primary animate-progress w-full origin-left-right"></div>
          </div>
      )}
    </div>
  );
}
