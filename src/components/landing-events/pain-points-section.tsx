// src/components/landing-events/pain-points-section.tsx
import { LandingEventsPainPoint } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface PainPointsSectionProps {
  title: string;
  points: [LandingEventsPainPoint, LandingEventsPainPoint, LandingEventsPainPoint];
}

export function PainPointsSection({ title, points }: PainPointsSectionProps) {
  return (
    <section className="bg-gray-50 py-20 px-4 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {title}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {points.map((point) => (
            <Card key={point.id} className="text-left overflow-hidden border bg-card text-card-foreground shadow-sm h-full flex flex-col">
               {point.imageUrl ? (
                <div className="relative aspect-video w-full border-b">
                    <img 
                        src={point.imageUrl} 
                        alt={point.title} 
                        className="object-cover w-full h-full"
                    />
                </div>
               ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-red-50 border-b">
                    <AlertCircle className="h-12 w-12 text-red-600" />
                </div>
               )}
              <CardHeader>
                <CardTitle className="text-xl font-bold">{point.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-muted-foreground leading-relaxed">{point.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
