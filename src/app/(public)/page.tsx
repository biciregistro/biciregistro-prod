import { getHomepageContent } from '@/lib/data';
import { HeroSection, FeaturesSection, CtaSection } from '@/components/homepage-components';

export default async function HomePage() {
  const allSections = await getHomepageContent();
  const heroSection = allSections.find(s => s.id === 'hero');
  const featuresSection = allSections.find(s => s.id === 'features');
  const ctaSection = allSections.find(s => s.id === 'cta');

  return (
    <>
      <HeroSection section={heroSection} />
      <div className="container px-4">
        <FeaturesSection section={featuresSection} />
        <CtaSection section={ctaSection} />
      </div>
    </>
  );
}
