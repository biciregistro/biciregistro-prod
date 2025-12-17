// src/components/landing-events/hero-section.tsx
import { LandingEventsHero } from '@/lib/types';
import { Button } from '@/components/ui/button';
import React from 'react';
import Link from 'next/link';

interface HeroSectionProps {
  content: LandingEventsHero;
}

const WHATSAPP_NUMBER = "5215547716640"; // Country code (52) + Area code (1) + Number
const WHATSAPP_MESSAGE = "Hola me interesa conocer mas sobre su plataforma de gestión de eventos.";

export function HeroSection({ content }: HeroSectionProps) {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <section
      className="relative bg-cover bg-center bg-no-repeat py-24 px-4 text-center sm:py-32 md:py-48"
      style={{ backgroundImage: `url(${content.backgroundImageUrl})` }}
    >
      {/* Increased overlay opacity for better contrast */}
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 mx-auto max-w-4xl">
        {/* Explicit text-white and drop-shadow */}
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl drop-shadow-xl">
          {content.title}
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-200 sm:text-xl drop-shadow-md">
          {content.subtitle}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-y-4">
          <Button size="lg" className="px-10 py-6 text-lg font-semibold shadow-lg hover:scale-105 transition-transform" asChild>
            <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              {content.ctaButton}
            </Link>
          </Button>
          <p className="text-sm text-gray-300 font-medium">
            {content.trustCopy}
          </p>
        </div>
      </div>
    </section>
  );
}
