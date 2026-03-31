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
import { cn } from '@/lib/utils';

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

    params.delete('page');

    startTransition(() => {
      router.push(`/events?${params.toString()}`, { scroll: false });
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
    <div className="w-full space-y-4">
      {/* Barra Principal - Estilo Dark Premium */}
      <div className="flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="relative flex-grow group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="¿Qué aventura buscas hoy?..." 
            className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-primary focus-visible:border-primary rounded-xl text-lg transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 no-scrollbar items-center">
          {/* Botón Filtro Rápido Fin de Semana */}
          <Button 
            variant="outline" 
            size="lg"
            onClick={applyWeekendFilter}
            className={cn(
                "h-14 whitespace-nowrap rounded-xl font-bold transition-all px-6",
                startDate && endDate ? "bg-primary text-white border-primary" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            )}
          >
            <CalendarIcon className="mr-2 h-5 w-5" />
            Este fin de semana
          </Button>

          {/* Botón de Filtros Avanzados */}
          <Sheet>
            <SheetTrigger asChild>
              <Button size="lg" variant="outline" className="h-14 px-6 rounded-xl bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white relative font-bold transition-all">
                <Filter className="mr-2 h-5 w-5" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-white text-[10px] border-none">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-[400px] bg-slate-950 border-white/10 text-white overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-white text-2xl font-black italic uppercase italic tracking-tight">Filtrar Eventos</SheetTitle>
                <SheetDescription className="text-slate-400">
                  Refina tu búsqueda para encontrar la rodada perfecta.
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-6 py-8">
                {/* Tipo de Evento */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Tipo de Evento</label>
                  <Select 
                    value={eventType} 
                    onValueChange={(val) => {
                        setEventType(val);
                        updateFilters({ eventType: val });
                    }}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 h-12">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      {EVENT_TYPES.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Modalidad */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Modalidad</label>
                  <Select 
                    value={modality}
                    onValueChange={(val) => {
                        setModality(val);
                        updateFilters({ modality: val });
                    }}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 h-12">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <SelectItem value="all">Todas las modalidades</SelectItem>
                      {MODALITIES.map((m: string) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ubicación */}
                <div className="space-y-4 border-t border-white/5 pt-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> País
                    </label>
                    <Select 
                      value={country} 
                      onValueChange={(val) => {
                          setCountry(val);
                          setState('all'); 
                          updateFilters({ country: val, state: 'all' });
                      }}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 h-12">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        <SelectItem value="all">Todos los países</SelectItem>
                        {countries.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {country !== 'all' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Estado / Provincia</label>
                        <Select 
                          value={state}
                          onValueChange={(val) => {
                              setState(val);
                              updateFilters({ state: val });
                          }}
                        >
                        <SelectTrigger className="bg-white/5 border-white/10 h-12">
                            <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="all">Todos los estados</SelectItem>
                            {states.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                        </Select>
                    </div>
                  )}
                </div>

                {/* Fechas */}
                <div className="space-y-4 border-t border-white/5 pt-6">
                   <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" /> Rango de Fechas
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold ml-1">Desde</span>
                            <Input 
                                type="date" 
                                className="bg-white/5 border-white/10 h-12 invert-[0.8]"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    updateFilters({ startDate: e.target.value });
                                }}
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 uppercase font-bold ml-1">Hasta</span>
                            <Input 
                                type="date" 
                                className="bg-white/5 border-white/10 h-12 invert-[0.8]"
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

              <SheetFooter className="flex-col gap-3 sm:flex-col pt-6 border-t border-white/5">
                <SheetClose asChild>
                    <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-14 rounded-xl">Aplicar filtros</Button>
                </SheetClose>
                <Button variant="ghost" onClick={handleClearFilters} className="w-full text-slate-500 hover:text-white transition-colors font-bold uppercase tracking-widest text-[10px]">
                    Limpiar todo
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      {isPending && (
          <div className="h-1 w-full bg-white/5 overflow-hidden rounded-full mt-2">
              <div className="h-full bg-primary animate-pulse w-full"></div>
          </div>
      )}
    </div>
  );
}
