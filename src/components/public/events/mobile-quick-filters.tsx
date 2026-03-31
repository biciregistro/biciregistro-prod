'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { Sparkles, Trophy, Bike, GraduationCap, X } from 'lucide-react';

const FILTERS = [
  { id: 'next', label: 'Próximos', icon: Sparkles },
  { id: 'competencia', label: 'Competencias', icon: Trophy, eventType: 'Competencia' },
  { id: 'rodada', label: 'Rodadas', icon: Bike, eventType: 'Rodada' },
  { id: 'taller', label: 'Talleres', icon: GraduationCap, eventType: 'Taller' },
];

export function MobileQuickFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentEventType = searchParams.get('eventType');
  const currentStartDate = searchParams.get('startDate');

  const handleFilter = (filter: typeof FILTERS[0]) => {
    const params = new URLSearchParams();

    if (filter.id === 'next') {
      const today = new Date();
      params.set('startDate', format(today, 'yyyy-MM-dd'));
      params.set('endDate', format(addDays(today, 7), 'yyyy-MM-dd'));
    } else if ('eventType' in filter) {
      params.set('eventType', filter.eventType as string);
    }

    startTransition(() => {
      router.push(`/events?${params.toString()}`, { scroll: false });
    });
  };

  const isActive = (filter: typeof FILTERS[0]) => {
    if (filter.id === 'next') return !!currentStartDate;
    if ('eventType' in filter) return currentEventType === filter.eventType;
    return false;
  };

  const hasActiveFilters = !!currentEventType || !!currentStartDate;

  return (
    <div className="flex flex-col gap-4">
        {/* Grid de filtros con texto más legible para móvil */}
        <div className="grid grid-cols-2 gap-3 px-2">
            {FILTERS.map((f) => {
                const Icon = f.icon;
                const active = isActive(f);
                return (
                <button
                    key={f.id}
                    onClick={() => handleFilter(f)}
                    disabled={isPending}
                    className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-tight transition-all border shrink-0 h-14",
                    active 
                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-[1.02]" 
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    )}
                >
                    <Icon className={cn("w-4 h-4", active ? "text-white" : "text-primary")} />
                    {f.label}
                </button>
                );
            })}
        </div>
        
        {hasActiveFilters && (
            <div className="flex justify-center px-2">
                <button 
                    onClick={() => router.push('/events')}
                    className="flex items-center justify-center gap-2 w-full py-4 text-xs font-black text-primary uppercase tracking-widest bg-primary/10 rounded-xl border border-primary/20 animate-in fade-in zoom-in duration-300"
                >
                    <X className="w-3 h-3" />
                    Limpiar Filtros
                </button>
            </div>
        )}
    </div>
  );
}
