'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Star, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPublicGamificationCatalog } from "@/lib/actions/gamification-actions";
import { RULE_ICONS } from "@/lib/gamification/rules-catalog";
import { GamificationRuleId } from "@/lib/gamification/constants";

interface GamificationRulesSheetProps {
    children: React.ReactNode;
}

type RuleItem = {
    id: string;
    label: string;
    description: string;
    points: number;
    type: string;
};

export function GamificationRulesSheet({ children }: GamificationRulesSheetProps) {
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar reglas dinámicas al abrir o montar
  // Nota: Podríamos optimizar para cargar solo al abrir (onOpenChange), 
  // pero cargar al montar simplifica la lógica inicial.
  useEffect(() => {
    async function load() {
        const res = await getPublicGamificationCatalog();
        if (res.success && res.data) {
            setRules(res.data as RuleItem[]);
        }
        setLoading(false);
    }
    load();
  }, []);

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] sm:h-[650px] rounded-t-3xl sm:max-w-2xl sm:mx-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-2xl flex items-center gap-2">
            <Star className="h-6 w-6 fill-yellow-400 text-yellow-500" />
            ¿Cómo ganar Kilómetros?
          </SheetTitle>
          <SheetDescription>
            Cada acción positiva en el ecosistema te otorga Kilómetros que te ayudan a subir de nivel y desbloquear beneficios exclusivos.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-full pr-4 pb-12">
          {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                  <p className="text-sm text-muted-foreground">Cargando catálogo de recompensas...</p>
              </div>
          ) : (
            <div className="space-y-6 pb-20">
                {rules.map((rule) => {
                // Get icon from map or default fallback
                const Icon = RULE_ICONS[rule.id as GamificationRuleId] || Star;
                
                return (
                    <div key={rule.id} className="flex items-start gap-4 p-1 group">
                    <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary/20 transition-colors shrink-0">
                        <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-sm sm:text-base leading-none">
                                {rule.label}
                            </h4>
                            <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1 font-bold shrink-0">
                                +{rule.points} <Star className="h-3 w-3 fill-yellow-400" />
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            {rule.description}
                        </p>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                            {rule.type === 'once' ? 'Una sola vez' : 'Por cada vez'}
                        </span>
                    </div>
                    </div>
                );
                })}
                
                <div className="bg-muted/30 p-4 rounded-2xl mt-4">
                    <p className="text-[11px] text-center text-muted-foreground leading-snug">
                        * Los Kilómetros son validados por nuestro sistema de seguridad. El uso indebido o fraudulento de las acciones puede resultar en la suspensión de la cuenta.
                    </p>
                </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
