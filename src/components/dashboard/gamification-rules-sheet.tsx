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
import { Star, Loader2, CheckCircle2, Coins, Map, Link as LinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPublicGamificationCatalog } from "@/lib/actions/gamification-actions";
import { RULE_ICONS } from "@/lib/gamification/rules-catalog";
import { GamificationRuleId } from "@/lib/gamification/constants";
import { cn } from "@/lib/utils";
import Image from 'next/image';

interface GamificationRulesSheetProps {
    children: React.ReactNode;
}

type RuleItem = {
    id: string;
    label: string;
    description: string;
    points: number;
    type: string;
    completed?: boolean;
    isStravaRule?: boolean;
    iconType?: 'route' | 'link';
    customBadgeText?: string;
};

export function GamificationRulesSheet({ children }: GamificationRulesSheetProps) {
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar reglas dinámicas al abrir o montar
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
            <Coins className="h-6 w-6 text-yellow-500" />
            ¿Cómo ganar B-coins?
          </SheetTitle>
          <SheetDescription>
            Cada acción positiva en el ecosistema te otorga B-coins que te ayudan a subir de nivel y desbloquear beneficios exclusivos.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-full pr-4 pb-12">
          {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                  <p className="text-sm text-muted-foreground">Cargando catálogo de recompensas...</p>
              </div>
          ) : (
            <div className="space-y-4 pb-20">
                {rules.map((rule) => {
                
                // Determinar el ícono (Star es el default, Map/Link para Strava artificiales)
                let Icon = RULE_ICONS[rule.id as GamificationRuleId] || Star;
                if (rule.iconType === 'route') Icon = Map;
                if (rule.iconType === 'link') Icon = LinkIcon;
                
                const isCompleted = rule.completed;
                
                return (
                    <div 
                        key={rule.id} 
                        className={cn(
                            "flex items-start gap-4 p-3 rounded-xl transition-colors group",
                            isCompleted ? "opacity-60 bg-muted/40 grayscale-[0.2]" : "hover:bg-muted/20"
                        )}
                    >
                        <div className={cn(
                            "p-3 rounded-xl shrink-0 relative",
                            isCompleted ? "bg-muted" : "bg-primary/10 group-hover:bg-primary/20 transition-colors"
                        )}>
                            <Icon className={cn("h-6 w-6", isCompleted ? "text-muted-foreground" : "text-primary")} />
                            {isCompleted && (
                                <div className="absolute -bottom-1 -right-1 bg-background rounded-full">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <h4 className={cn("font-bold text-sm sm:text-base leading-none", isCompleted && "line-through text-muted-foreground")}>
                                    {rule.label}
                                </h4>
                                {isCompleted ? (
                                    <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/20 gap-1 font-semibold shrink-0 text-[10px]">
                                        Completado
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1 font-bold shrink-0">
                                        {rule.customBadgeText ? (
                                            rule.customBadgeText
                                        ) : (
                                            `+${rule.points}`
                                        )} <Coins className="h-3 w-3 text-yellow-600" />
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                {rule.description.replace(/Kilómetros/g, 'B-coins').replace(/KM/g, 'B-coins')}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                                {!isCompleted && (
                                    <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                                        {rule.type === 'once' ? 'Una sola vez' : 'Por cada vez'}
                                    </span>
                                )}
                                {rule.isStravaRule && (
                                    <div className={cn("flex justify-end", isCompleted ? "w-full mt-2" : "")}>
                                        <Image 
                                            src="/strava/api_logo_pwrdBy_strava_horiz_black.svg" 
                                            alt="Powered by Strava" 
                                            width={80} 
                                            height={16}
                                            className="opacity-50"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
                })}
                
                <div className="bg-muted/30 p-4 rounded-2xl mt-6">
                    <p className="text-[11px] text-center text-muted-foreground leading-snug">
                        * Las B-coins son validadas por nuestro sistema de seguridad. El uso indebido o fraudulento de las acciones puede resultar en la suspensión de la cuenta.
                    </p>
                </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}