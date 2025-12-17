// src/components/landing-events/cta-section.tsx
import { LandingEventsAlly, LandingEventsCta } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';

interface CtaSectionProps {
  cta: LandingEventsCta;
  allies: LandingEventsAlly[];
}

const WHATSAPP_NUMBER = "5215547716640";
const WHATSAPP_MESSAGE = "Hola me interesa conocer mas sobre su plataforma de gestión de eventos.";

export function CtaSection({ cta, allies }: CtaSectionProps) {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <section className="bg-white py-20 px-4 sm:py-24">
      <div className="mx-auto max-w-4xl text-center">
        {allies && allies.length > 0 && (
          <div className="mb-12">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Con la confianza de organizadores líderes
            </h3>
            <div className="mt-6 flow-root">
              <div className="-mt-4 flex flex-wrap justify-center gap-x-8 gap-y-4">
                {allies.map((ally) => (
                  <div key={ally.name} className="flex flex-shrink-0 items-center justify-center">
                    <Image
                      className="h-12 object-contain"
                      src={ally.logoUrl}
                      alt={ally.name}
                      width={158}
                      height={48}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {cta.title}
        </h2>
        <p className="mt-4 text-lg text-gray-600">
          {cta.description}
        </p>
        <div className="mt-10">
          <Button size="lg" className="px-10 py-6 text-lg" asChild>
             <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              {cta.ctaButton}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
