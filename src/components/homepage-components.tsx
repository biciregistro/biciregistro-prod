'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bike, QrCode, ShieldCheck } from 'lucide-react';
import type { HomepageSection } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';


const getImageData = (id: string) => {
    return PlaceHolderImages.find(p => p.id === id) || PlaceHolderImages[0];
}

export function HeroSection({ section }: { section: HomepageSection }) {
  return (
    <section className="relative w-full h-[60vh] md:h-[70vh]">
      <Image
        src={getImageData('hero-background').imageUrl}
        alt={getImageData('hero-background').description}
        data-ai-hint={getImageData('hero-background').imageHint}
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="container text-center text-foreground">
          <div className="bg-background/80 backdrop-blur-sm p-8 rounded-xl max-w-3xl mx-auto">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
              {section.title}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {section.subtitle}
            </p>
            <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
              {section.content}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/signup">Register Your Bike</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/search">Search a Bike</Link>
              </Button>
            </div>
            <div className="mt-8 max-w-lg mx-auto">
                <BikeSearchForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

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
                placeholder="Enter bike serial number..."
                className="flex-1"
                aria-label="Bike serial number"
            />
            <Button type="submit">Search</Button>
        </form>
    )
}

const features = [
    {
        icon: ShieldCheck,
        title: "Secure Registration",
        description: "Quickly register your bike's serial number and details in our secure database.",
        imageId: "feature-registration"
    },
    {
        icon: Bike,
        title: "Instant Theft Reporting",
        description: "Mark your bike as stolen with one click to alert the community and authorities.",
        imageId: "feature-theft-report"
    },
    {
        icon: QrCode,
        title: "Ownership Verification",
        description: "Easily verify a bike's status using its serial number before buying or selling.",
        imageId: "feature-community"
    }
]

export function FeaturesSection({ section }: { section: HomepageSection }) {
  return (
    <section className="py-16 sm:py-24 bg-secondary/50">
      <div className="container text-center">
        <h2 className="text-3xl font-bold tracking-tight">{section.title}</h2>
        <p className="mt-2 text-lg text-muted-foreground">{section.subtitle}</p>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {features.map((feature, index) => {
                const imageData = getImageData(feature.imageId);
                return (
                    <Card key={index} className="text-left overflow-hidden">
                        <CardHeader>
                            <div className="relative aspect-video mb-4">
                                <Image 
                                    src={imageData.imageUrl}
                                    alt={imageData.description}
                                    data-ai-hint={imageData.imageHint}
                                    fill
                                    className="object-cover rounded-t-lg"
                                />
                            </div>
                            <CardTitle className="flex items-center gap-2">
                                <feature.icon className="w-6 h-6 text-primary" />
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

export function CtaSection({ section }: { section: HomepageSection }) {
    const imageData = getImageData('cta-background');
    return (
        <section className="py-16 sm:py-24">
            <div className="container">
                <div className={cn(
                    "relative rounded-lg p-10 md:p-20 overflow-hidden",
                    "flex items-center justify-center text-center",
                    "bg-cover bg-center"
                )} style={{backgroundImage: `url(${imageData.imageUrl})`}}>
                    <div className="absolute inset-0 bg-background/80" />
                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold tracking-tight">{section.title}</h2>
                        <p className="mt-2 text-lg text-muted-foreground">{section.subtitle}</p>
                        <div className="mt-8">
                            <Button asChild size="lg">
                                <Link href="/signup">Get Started for Free</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
