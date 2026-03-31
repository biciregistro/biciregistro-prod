'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Bike, QrCode, AlertTriangle, Search, Info, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { HomepageSection } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { SponsorsCarousel } from './shared/sponsors-carousel';
import { ValuationWidget } from './public/valuation-widget';

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
        <form action={handleSearch} className="flex flex-col sm:flex-row w-full items-center gap-3">
            <div className="relative w-full flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    type="text"
                    name="serial"
                    placeholder="Introduce el número de serie de la bicicleta..."
                    className="pl-10 h-14 text-lg border-2 border-slate-200 focus:border-primary focus:ring-primary/20 rounded-xl transition-all shadow-sm"
                    aria-label="Número de serie de la bicicleta"
                />
            </div>
            <Button type="submit" size="lg" className="h-14 px-8 text-base font-bold rounded-xl shadow-lg shadow-primary/20 w-full sm:w-auto transition-transform hover:scale-[1.02]">
                Validar Estatus
            </Button>
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
                        <Skeleton className="h-[300px] w-full" />
                    </div>
                </div>
            </div>
        </section>
    );
  }

  return (
    <section className="relative w-full min-h-[70vh] flex items-center pt-5 pb-10">
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
          <div className="bg-background/80 backdrop-blur-sm p-8 rounded-xl max-w-3xl mx-auto shadow-xl">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-foreground">
              {section.title}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {section.subtitle}
            </p>
            
            <div className="mt-8 w-full max-w-2xl mx-auto">
               <ValuationWidget />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Bike Search Section (New) ---
export function BikeSearchSection({ section }: { section?: Extract<HomepageSection, { id: 'hero' }> }) {
    const buttonText = section?.buttonText || "Únete a la red gratis";

    return (
        <section className="py-16 md:py-24 bg-slate-50 border-y border-border/50 relative overflow-hidden">
            {/* Elementos decorativos de fondo sutiles */}
            <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>

            <div className="container px-4 relative z-10">
                <div className="max-w-4xl mx-auto text-center mb-10 md:mb-14">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-[0.1em] mb-6 border border-primary/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Centro de Validación Oficial
                    </div>
                    <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight mb-4">
                        ¿Vas a comprar una bici usada?
                    </h2>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Verifica el estatus legal de cualquier número de serie y compra con total tranquilidad.
                    </p>
                </div>
                
                <Card className="max-w-2xl mx-auto shadow-xl shadow-primary/5 border-border/50 rounded-2xl overflow-hidden mb-12 bg-background/80 backdrop-blur-sm">
                    <CardContent className="p-6 md:p-10">
                        <BikeSearchForm />
                        
                        <div className="flex items-start gap-3 mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10 text-primary text-xs leading-relaxed">
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="font-medium">
                                <span className="font-bold">Privacidad de Datos:</span> Esta consulta es 100% anónima. El sistema solo confirmará si la serie cuenta con reporte vigente o está en regla, protegiendo siempre la identidad del propietario original.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-col items-center gap-10">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg">
                        <Button asChild size="lg" className="w-full sm:w-1/2 h-14 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                            <Link href="/signup">{buttonText}</Link>
                        </Button>
                        
                        <Button asChild size="lg" className="w-full sm:w-1/2 h-14 font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-200 transition-all hover:scale-105 active:scale-95 gap-2">
                            <Link href="/reportar-robo">
                                <ShieldAlert className="w-4 h-4" />
                                Reportar un robo
                            </Link>
                        </Button>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 px-8 py-4 rounded-full bg-background border border-border shadow-sm transition-all hover:shadow-md group">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/20 p-1.5 rounded-full">
                                 <ShieldCheck className="w-4 h-4 text-primary" />
                            </div>
                            <span className="text-sm font-bold text-foreground">Validación Segura</span>
                        </div>
                        <div className="hidden md:block w-px h-4 bg-border"></div>
                        <span className="text-sm text-muted-foreground font-medium text-center">
                            Cientos de bicicletas se validan al día para combatir el mercado negro en México.
                        </span>
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

// --- Security Section ---
export function SecuritySection({ section }: { section?: Extract<HomepageSection, { id: 'security' }> }) {
    if (!section || !section.items) {
        return (
            <section className="py-12 sm:py-16 bg-secondary/50">
                <div className="container text-center space-y-4 px-4">
                    <Skeleton className="h-9 w-3/4 mx-auto" />
                    <Skeleton className="h-6 w-full mx-auto" />
                    <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
                        {[...Array(3)].map((_, i) => (
                            <Card key={i}>
                                <Skeleton className="aspect-video" />
                                <CardHeader>
                                    <Skeleton className="h-6 w-3/4" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-5/6 mt-2" />
                                </CardContent>
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
            {section.items.map((item, index) => (
                <Card key={index} className="text-left overflow-hidden">
                    <div className="relative aspect-video">
                        <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                    </div>
                    <CardHeader>
                        <CardTitle>{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{item.description}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </section>
  );
}
