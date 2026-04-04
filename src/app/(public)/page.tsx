import { getHomepageData } from '@/lib/data';
import { HeroSection, FeaturesSection, CtaSection, AlliesSection, SecuritySection, BikeSearchSection, GlobalSignupBanner } from '@/components/homepage-components';
import { HomepageSection } from '@/lib/types';
import { UpcomingEventsSection } from '@/components/landing-events/upcoming-events-section';
import { getRecentSocialProofMessages } from '@/lib/data/social-proof-data';
import SocialProofWidget from '@/components/shared/social-proof-widget';
import { getDecodedSession } from '@/lib/auth/server';

export default async function HomePage() {
  const sections = await getHomepageData();
  const session = await getDecodedSession();
  const isAuthenticated = !!session;
  
  const heroSection = sections['hero'] as Extract<HomepageSection, { id: 'hero' }>;
  
  // Realiza el query a la base de datos anonimizado con caché de 1h
  const proofMessages = await getRecentSocialProofMessages();

  return (
    <main>
      <HeroSection 
        section={heroSection} 
        isAuthenticated={isAuthenticated}
      />
      
      {/* Nuevo Banner de Registro Global ubicado entre Hero y Aliados */}
      <GlobalSignupBanner 
        buttonText={heroSection?.buttonText || "Únete a la red gratis"} 
        isAuthenticated={isAuthenticated} 
      />

      <AlliesSection section={sections['allies'] as Extract<HomepageSection, { id: 'allies' }>} />
      
      <BikeSearchSection />
      
      <FeaturesSection section={sections['features'] as Extract<HomepageSection, { id: 'features' }>} />
      <SecuritySection section={sections['security'] as Extract<HomepageSection, { id: 'security' }>} />
      <UpcomingEventsSection />
      <CtaSection section={sections['cta'] as Extract<HomepageSection, { id: 'cta' }>} />
      
      {/* Componente Flotante Inyectado */}
      {proofMessages.length > 0 && <SocialProofWidget messages={proofMessages} />}
    </main>
  );
}
