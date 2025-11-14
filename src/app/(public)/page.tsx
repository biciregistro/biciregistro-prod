import { getHomepageData } from '@/lib/data';
import { HeroSection, FeaturesSection, CtaSection } from '@/components/homepage-components';
import { HomepageSection } from '@/lib/types';

export default async function HomePage() {
  const sections = await getHomepageData();

  return (
    <main>
      <HeroSection section={sections['hero'] as Extract<HomepageSection, { id: 'hero' }>} />
      <FeaturesSection section={sections['features'] as Extract<HomepageSection, { id: 'features' }>} />
      <CtaSection section={sections['cta'] as Extract<HomepageSection, { id: 'cta' }>} />
    </main>
  );
}
