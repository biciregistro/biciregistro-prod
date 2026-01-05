// src/components/landing-events/solution-section.tsx
import { LandingEventsSolution } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import React from 'react';

interface SolutionSectionProps {
  title: string;
  solutions: [LandingEventsSolution, LandingEventsSolution, LandingEventsSolution];
}

const iconMap: { [key: string]: React.ElementType } = {
  monetization: CheckCircle2,
  legal: ShieldCheck,
  operations: Zap,
};

export function SolutionSection({ title, solutions }: SolutionSectionProps) {
  return (
    <section className="bg-white py-20 px-4 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {title}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {solutions.map((solution) => {
            const Icon = iconMap[solution.id] || CheckCircle2;
            return (
              <Card key={solution.id} className="text-left overflow-hidden border bg-card text-card-foreground shadow-sm h-full flex flex-col">
                {solution.imageUrl ? (
                    <div className="relative aspect-video w-full border-b">
                        <img 
                            src={solution.imageUrl} 
                            alt={solution.title} 
                            className="object-cover w-full h-full"
                        />
                    </div>
                ) : (
                    <div className="flex aspect-video w-full items-center justify-center bg-blue-50 border-b">
                        <Icon className="h-16 w-16 text-blue-200" />
                    </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 shrink-0">
                        <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-xl font-bold leading-tight">{solution.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-muted-foreground leading-relaxed">{solution.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
