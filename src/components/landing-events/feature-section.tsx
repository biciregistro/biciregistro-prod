// src/components/landing-events/feature-section.tsx
import { LandingEventsFeature } from '@/lib/types';
import Image from 'next/image';

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
          <p className="mt-4 text-lg text-gray-300">
            {content.description}
          </p>
        </div>
        <div className="rounded-lg bg-gray-800 p-2">
           <Image
            src={content.imageUrl}
            alt="Dashboard de Event Manager"
            width={1200}
            height={800}
            className="rounded-md shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}
