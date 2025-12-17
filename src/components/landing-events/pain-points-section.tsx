// src/components/landing-events/pain-points-section.tsx
import { LandingEventsPainPoint } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react'; // Assuming lucide-react for icons

interface PainPointsSectionProps {
  title: string;
  points: [LandingEventsPainPoint, LandingEventsPainPoint, LandingEventsPainPoint];
}

export function PainPointsSection({ title, points }: PainPointsSectionProps) {
  return (
    <section className="bg-gray-50 py-20 px-4 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {title}
          </h2>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {points.map((point) => (
            <Card key={point.id} className="text-center">
              <CardHeader>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle className="mt-4">{point.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{point.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
