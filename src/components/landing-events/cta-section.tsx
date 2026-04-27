// src/components/landing-events/cta-section.tsx
import { LandingEventsCta, LandingEventsAlly } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface CtaSectionProps {
  cta: LandingEventsCta;
  allies: LandingEventsAlly[];
}

export function CtaSection({ cta, allies }: CtaSectionProps) {
  return (
    <section className="bg-gray-50 py-20 px-4 text-center border-t">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {cta.title}
        </h2>
        <p className="mt-4 text-lg leading-8 text-gray-600">
          {cta.description}
        </p>
        <div className="mt-8 flex flex-col items-center gap-y-4">
          <Button size="lg" className="px-8 py-6 text-lg font-bold shadow-md hover:scale-105 transition-transform" asChild>
             {/* LINK MODIFIED: Now points to the dedicated ONG Registration route */}
            <Link href="/ong/signup">
              {cta.ctaButton}
            </Link>
          </Button>
          {cta.trustCopy && (
            <p className="text-sm text-gray-500 italic mt-2">
              {cta.trustCopy}
            </p>
          )}
        </div>

        {/* Social Proof (Allies) in CTA area */}
        {allies.length > 0 && (
          <div className="mt-16 pt-8 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-6">
              Ellos ya confían en nosotros
            </p>
            <div className="flex flex-wrap justify-center gap-8 md:gap-12 items-center opacity-70 grayscale hover:grayscale-0 transition-all">
              {allies.map((ally, idx) => (
                <div key={idx} className="relative h-12 w-24 sm:h-16 sm:w-32">
                  <img
                    src={ally.logoUrl}
                    alt={ally.name}
                    className="object-contain w-full h-full"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
