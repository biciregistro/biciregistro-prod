// src/components/landing-events/feature-section.tsx
import { LandingEventsFeature } from '@/lib/types';

interface FeatureSectionProps {
  content: LandingEventsFeature;
}

export function FeatureSection({ content }: FeatureSectionProps) {
  return (
    <section className="bg-gray-900 py-20 px-4 text-white sm:py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 md:grid-cols-2">
        <div className="md:pr-12">
          {/* Explicitly set text color and add drop shadow for contrast */}
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl drop-shadow-md">
            {content.title}
          </h2>
          <p className="mt-4 text-lg text-gray-300 leading-relaxed">
            {content.description}
          </p>
        </div>
        <div className="rounded-xl bg-gray-800/50 p-2 backdrop-blur-sm border border-white/10 overflow-hidden shadow-2xl">
           <img
            src={content.imageUrl}
            alt="Dashboard de Event Manager"
            className="rounded-lg w-full h-auto"
          />
        </div>
      </div>
    </section>
  );
}
