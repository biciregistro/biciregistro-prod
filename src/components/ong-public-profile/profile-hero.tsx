import Image from 'next/image';
import { MapPin, Users, Facebook, Instagram, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OngUser } from '@/lib/types';

interface ProfileHeroProps {
  ong: Omit<OngUser, 'email' | 'role'>;
  communityCount: number;
}

export function ProfileHero({ ong, communityCount }: ProfileHeroProps) {
  return (
    <div className="relative mb-8">
      {/* Cover Image Container - Increased height */}
      <div className="h-[350px] md:h-[500px] w-full relative overflow-hidden bg-muted">
        {ong.coverUrl ? (
          <Image
            src={ong.coverUrl}
            alt="Cover"
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/10" />
        )}
        
        {/* Gradient Overlay for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Profile Header Content - Now INSIDE the cover image */}
        <div className="absolute bottom-0 left-0 w-full p-4 md:p-8">
          <div className="container mx-auto flex flex-col md:flex-row md:items-end gap-4 md:gap-8">
            {/* Logo */}
            <div className="relative h-24 w-24 md:h-40 md:w-40 rounded-2xl overflow-hidden border-4 border-white/20 bg-background/10 backdrop-blur-md shadow-2xl shrink-0">
              {ong.logoUrl ? (
                <Image
                  src={ong.logoUrl}
                  alt={ong.organizationName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/10">
                  <Users className="h-12 w-12 text-white/50" />
                </div>
              )}
            </div>

            {/* Title and Stats - Text color forced to white */}
            <div className="mb-2 space-y-2 flex-1 min-w-0">
              <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-md truncate">
                {ong.organizationName}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm md:text-base text-white/90">
                <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                  <MapPin className="h-4 w-4" />
                  <span>{ong.state}, {ong.country}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-primary/80 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20 font-medium">
                  <Users className="h-4 w-4" />
                  <span>{communityCount} miembros en la comunidad</span>
                </div>
              </div>
            </div>

            {/* Social Links Desktop - Forced white icons */}
            <div className="hidden md:flex items-center gap-3 mb-2">
              {ong.facebookUrl && (
                <Button variant="outline" size="icon" className="rounded-full bg-white/10 border-white/20 hover:bg-white/20 text-white" asChild>
                  <a href={ong.facebookUrl} target="_blank" rel="noopener noreferrer">
                    <Facebook className="h-5 w-5" />
                  </a>
                </Button>
              )}
              {ong.instagramUrl && (
                <Button variant="outline" size="icon" className="rounded-full bg-white/10 border-white/20 hover:bg-white/20 text-white" asChild>
                  <a href={ong.instagramUrl} target="_blank" rel="noopener noreferrer">
                    <Instagram className="h-5 w-5" />
                  </a>
                </Button>
              )}
              {ong.websiteUrl && (
                <Button variant="outline" size="icon" className="rounded-full bg-white/10 border-white/20 hover:bg-white/20 text-white" asChild>
                  <a href={ong.websiteUrl} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-5 w-5" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
