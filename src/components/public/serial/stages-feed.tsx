import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import type { Event } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface StagesFeedProps {
    stages: Event[];
}

export function StagesFeed({ stages }: StagesFeedProps) {
    if (!stages || stages.length === 0) {
        return <p className="text-muted-foreground text-sm">No hay fechas publicadas aún.</p>;
    }

    const today = new Date().toISOString();

    // Helper defensivo para parsear la fecha evitando el error "Invalid Date"
    const safeFormatDate = (dateString?: string) => {
        if (!dateString) return 'Por definir';
        try {
            // Si la cadena ya trae formato ISO completo (contiene una 'T'), usamos el string tal cual.
            // Si es un formato corto (YYYY-MM-DD), le inyectamos un mediodía neutral para evitar saltos de zona horaria.
            const parsedString = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
            const dateObj = new Date(parsedString);
            
            // Verificación final para asegurar que la fecha es válida
            if (isNaN(dateObj.getTime())) return 'Fecha inválida';

            return dateObj.toLocaleDateString('es-MX', { 
                day: 'numeric', month: 'short', year: 'numeric' 
            });
        } catch (e) {
            return 'Fecha no disponible';
        }
    };

    return (
        <div className="space-y-4">
            {stages.map((stage, index) => {
                const isPast = stage.date && stage.date < today;
                
                return (
                    <div 
                        key={stage.id} 
                        className={`group bg-white rounded-xl border p-5 transition-all duration-300 hover:shadow-md ${
                            isPast ? 'opacity-70 grayscale-[0.2]' : 'border-l-4 border-l-orange-500'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                    Etapa {index + 1}
                                </span>
                                <h4 className="font-bold text-base leading-tight mt-1 line-clamp-2">
                                    {stage.name}
                                </h4>
                            </div>
                            
                            {isPast ? (
                                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-medium shrink-0 ml-2">
                                    Finalizado
                                </span>
                            ) : (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-medium shrink-0 ml-2">
                                    Próximamente
                                </span>
                            )}
                        </div>

                        <div className="flex items-center text-sm text-gray-500 mb-4">
                            <Calendar className="w-4 h-4 mr-1.5" />
                            {safeFormatDate(stage.date)}
                        </div>

                        <Link href={`/events/${stage.id}`} className="block w-full">
                            <Button variant={isPast ? "outline" : "default"} className="w-full justify-between" size="sm">
                                {isPast ? 'Ver Resultados' : 'Inscribirse a Etapa'}
                                <ChevronRight className="w-4 h-4 opacity-50" />
                            </Button>
                        </Link>
                    </div>
                );
            })}
        </div>
    );
}
