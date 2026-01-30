import { getHomepageData } from '@/lib/data';
import { HeroSection, FeaturesSection, CtaSection, AlliesSection, SecuritySection } from '@/components/homepage-components';
import { HomepageSection } from '@/lib/types';
import { UpcomingEventsSection } from '@/components/landing-events/upcoming-events-section';

export default async function HomePage() {
  const sections = await getHomepageData();

  return (
    <main>
      <HeroSection section={sections['hero'] as Extract<HomepageSection, { id: 'hero' }>} />
      <AlliesSection section={sections['allies'] as Extract<HomepageSection, { id: 'allies' }>} />
      <FeaturesSection section={sections['features'] as Extract<HomepageSection, { id: 'features' }>} />
      <SecuritySection section={sections['security'] as Extract<HomepageSection, { id: 'security' }>} />
      <UpcomingEventsSection />
      <CtaSection section={sections['cta'] as Extract<HomepageSection, { id: 'cta' }>} />
    </main>
  );
}
