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
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {title}
          </h2>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {solutions.map((solution) => {
            const Icon = iconMap[solution.id] || CheckCircle2;
            return (
              <Card key={solution.id} className="text-center">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="mt-4">{solution.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{solution.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
