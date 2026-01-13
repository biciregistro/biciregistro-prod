
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GENERATIONS, GenerationInsight } from '@/lib/constants/generations';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Target, Zap, ShieldAlert, Globe } from 'lucide-react';

interface GenerationInsightsCardProps {
    dominantGenerationId: string;
}

export function GenerationInsightsCard({ dominantGenerationId }: GenerationInsightsCardProps) {
    const insight: GenerationInsight | undefined = GENERATIONS[dominantGenerationId];

    if (!insight) {
        return (
            <Card className="h-full flex flex-col items-center justify-center p-6 text-muted-foreground italic">
                Selecciona una generación para ver insights.
            </Card>
        );
    }

    return (
        <Card className="h-full overflow-hidden border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Perfil Dominante
                    </CardTitle>
                    <Badge variant="default" className="bg-primary text-primary-foreground">
                        {insight.label}
                    </Badge>
                </div>
                <CardDescription className="text-primary/80 font-medium italic">
                    "{insight.focus}"
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight.description}
                </p>

                <div className="grid gap-3 text-sm">
                    <div className="flex gap-3">
                        <Target className="h-4 w-4 mt-1 text-primary shrink-0" />
                        <div>
                            <span className="font-semibold block">Motivaciones:</span>
                            <span className="text-muted-foreground">{insight.motivations}</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <Globe className="h-4 w-4 mt-1 text-primary shrink-0" />
                        <div>
                            <span className="font-semibold block">Plataformas:</span>
                            <span className="text-muted-foreground">{insight.digitalPlatforms}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <ShieldAlert className="h-4 w-4 mt-1 text-primary shrink-0" />
                        <div>
                            <span className="font-semibold block">Barreras:</span>
                            <span className="text-muted-foreground">{insight.barriers}</span>
                        </div>
                    </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-1">
                    {insight.keywords.map(kw => (
                        <Badge key={kw} variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                            {kw}
                        </Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
