import { getHomepageData } from '@/lib/data';
import { HeroSection, FeaturesSection, CtaSection } from '@/components/homepage-components';

export default async function HomePage() {
  const sections = await getHomepageData();

  return (
    <main>
      <HeroSection section={sections['hero']} />
      <FeaturesSection section={sections['features']} />
      <CtaSection section={sections['cta']} />
    </main>
  );
}
