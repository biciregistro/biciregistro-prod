import { getHomepageData } from '@/lib/data';
import { HeroSection, FeaturesSection, CtaSection, AlliesSection, SecuritySection, BikeSearchSection } from '@/components/homepage-components';
import { HomepageSection } from '@/lib/types';
import { UpcomingEventsSection } from '@/components/landing-events/upcoming-events-section';
import { getRecentSocialProofMessages } from '@/lib/data/social-proof-data';
import SocialProofWidget from '@/components/shared/social-proof-widget';

export default async function HomePage() {
  const sections = await getHomepageData();
  
  // Realiza el query a la base de datos anonimizado con caché de 1h
  const proofMessages = await getRecentSocialProofMessages();

  return (
    <main>
      <HeroSection section={sections['hero'] as Extract<HomepageSection, { id: 'hero' }>} />
      <AlliesSection section={sections['allies'] as Extract<HomepageSection, { id: 'allies' }>} />
      <BikeSearchSection section={sections['hero'] as Extract<HomepageSection, { id: 'hero' }>} />
      <FeaturesSection section={sections['features'] as Extract<HomepageSection, { id: 'features' }>} />
      <SecuritySection section={sections['security'] as Extract<HomepageSection, { id: 'security' }>} />
      <UpcomingEventsSection />
      <CtaSection section={sections['cta'] as Extract<HomepageSection, { id: 'cta' }>} />
      
      {/* Componente Flotante Inyectado */}
      {proofMessages.length > 0 && <SocialProofWidget messages={proofMessages} />}
    </main>
  );
}
