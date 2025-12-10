'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Bike, QrCode } from 'lucide-react';
import type { HomepageSection } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { SponsorsCarousel } from './shared/sponsors-carousel';

// Helper to map an icon string to a component
const iconMap = {
    'ShieldCheck': ShieldCheck,
    'Bike': Bike,
    'QrCode': QrCode,
};

// --- Bike Search Form Component ---
export function BikeSearchForm() {
    const router = useRouter();

    const handleSearch = (formData: FormData) => {
        const serial = formData.get('serial');
        if (typeof serial === 'string' && serial.trim()) {
            router.push(`/search?serial=${encodeURIComponent(serial.trim())}`);
        }
    }

    return (
        <form action={handleSearch} className="flex w-full items-center space-x-2">
            <Input
                type="text"
                name="serial"
                placeholder="Introduce el numero de serie de la bici"
                className="flex-1"
                aria-label="Número de serie de la bicicleta"
            />
            <Button type="submit">Buscar</Button>
        </form>
    )
}

// --- Hero Section ---
export function HeroSection({ section }: { section?: Extract<HomepageSection, { id: 'hero' }> }) {
  if (!section) {
    return (
        <section className="relative w-full min-h-[60vh] flex items-center pt-5 pb-10">
            <Skeleton className="absolute inset-0" />
            <div className="container relative z-10 text-center px-4">
                <div className="bg-background/80 backdrop-blur-sm p-8 rounded-xl max-w-3xl mx-auto space-y-4">
                    <Skeleton className="h-12 w-3/4 mx-auto" />
                    <Skeleton className="h-6 w-full mx-auto" />
                    <div className="mt-8 max-w-lg mx-auto">
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            </div>
        </section>
    );
  }

  return (
    <section className="relative w-full min-h-[60vh] flex items-center pt-5 pb-10">
      {section.imageUrl && (
        <Image
          src={section.imageUrl}
          alt={section.title}
          fill
          className="object-cover"
          priority
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="relative z-10 w-full">
        <div className="container text-center text-foreground px-4">
          <div className="bg-background/80 backdrop-blur-sm p-8 rounded-xl max-w-3xl mx-auto">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
              {section.title}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {section.subtitle}
            </p>
            <div className="mt-8 max-w-lg mx-auto space-y-4">
               <BikeSearchForm />
               {section.buttonText && <Button asChild><Link href="/signup">{section.buttonText}</Link></Button>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Allies Section ---
export function AlliesSection({ section }: { section?: Extract<HomepageSection, { id: 'allies' }> }) {
  if (!section || !section.sponsors || section.sponsors.length === 0) {
    return null; // Or a skeleton if you prefer, but usually hidden if empty
  }

  return (
    <section className="w-full bg-background py-8 border-b">
      <div className="container px-4">
        <SponsorsCarousel 
            title={section.title} 
            sponsors={section.sponsors} 
            className="py-0" // Override default padding
        />
      </div>
    </section>
  );
}


// --- Features Section ---
export function FeaturesSection({ section }: { section?: Extract<HomepageSection, { id: 'features' }> }) {
    if (!section || !section.features) {
        return (
            <section className="py-12 sm:py-16 bg-secondary/50">
                <div className="container text-center space-y-4 px-4">
                    <Skeleton className="h-9 w-3/4 mx-auto" />
                    <Skeleton className="h-6 w-full mx-auto" />
                    <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
                        {[...Array(3)].map((_, i) => (
                            <Card key={i} className="p-4">
                                <Skeleton className="aspect-video mb-4" />
                                <Skeleton className="h-6 w-1/2 mb-2" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

  return (
    <section className="py-12 sm:py-16 bg-secondary/50">
      <div className="container text-center px-4">
        <h2 className="text-3xl font-bold tracking-tight">{section.title}</h2>
        <p className="mt-2 text-lg text-muted-foreground">{section.subtitle}</p>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {section.features.map((feature, index) => {
                const IconComponent = iconMap[Object.keys(iconMap)[index] as keyof typeof iconMap] || ShieldCheck;
                return (
                    <Card key={index} className="text-left overflow-hidden">
                        {feature.imageUrl && <div className="relative aspect-video"><Image src={feature.imageUrl} alt={feature.title} fill className="object-cover" /></div>}
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <IconComponent className="w-6 h-6 text-primary" />
                                <span>{feature.title}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{feature.description}</p>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
      </div>
    </section>
  );
}

// --- CTA Section ---
export function CtaSection({ section }: { section?: Extract<HomepageSection, { id: 'cta' }> }) {
    if (!section) {
        return (
            <section className="py-12 sm:py-16">
                <div className="container px-4">
                    <Skeleton className="h-64 w-full" />
                </div>
            </section>
        );
    }

    return (
        <section className="py-12 sm:py-16">
            <div className="container px-4">
                <div 
                    className="relative rounded-lg p-10 md:p-20 overflow-hidden flex items-center justify-center text-center bg-cover bg-center"
                    style={{ backgroundImage: section.imageUrl ? `url(${section.imageUrl})` : 'none' }}
                >
                    <div className="absolute inset-0 bg-background/80" />
                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold tracking-tight">{section.title}</h2>
                        <p className="mt-2 text-lg text-muted-foreground">{section.subtitle}</p>
                        <div className="mt-8">
                            {section.buttonText && (
                                <Button asChild size="lg">
                                    <Link href="/signup">{section.buttonText}</Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
