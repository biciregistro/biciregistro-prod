// src/app/(public)/events-manager/page.tsx
import React from 'react';
import { getLandingEventsContent } from '@/lib/data/landing-events-data';
import { HeroSection } from '@/components/landing-events/hero-section';
import { PainPointsSection } from '@/components/landing-events/pain-points-section';
import { SolutionSection } from '@/components/landing-events/solution-section';
import { FeatureSection } from '@/components/landing-events/feature-section';
import { CtaSection } from '@/components/landing-events/cta-section';

// Revalidate the page every hour, for example. Adjust as needed.
export const revalidate = 3600;

export default async function EventsManagerLandingPage() {
  const content = await getLandingEventsContent();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1">
        <HeroSection content={content.hero} />
        <PainPointsSection 
          title={content.painPointsSection.title}
          points={content.painPointsSection.points}
        />
        <SolutionSection
          title={content.solutionSection.title}
          solutions={content.solutionSection.solutions}
        />
        <FeatureSection content={content.featureSection} />
        <CtaSection
          cta={content.ctaSection}
          allies={content.socialProofSection.allies}
        />
      </main>
    </div>
  );
}
