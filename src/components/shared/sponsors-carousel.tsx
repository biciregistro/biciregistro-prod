import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Sponsor {
  name?: string;
  url: string;
}

interface SponsorsCarouselProps {
  title?: string;
  sponsors: Sponsor[] | string[]; // Support both object array and simple string array (for legacy compatibility)
  className?: string;
}

export function SponsorsCarousel({ title, sponsors, className }: SponsorsCarouselProps) {
  if (!sponsors || sponsors.length === 0) {
    return null;
  }

  // Normalize data to array of objects
  const normalizedSponsors: Sponsor[] = sponsors.map(s => 
    typeof s === 'string' ? { url: s } : s
  );

  // We duplicate the array to create a seamless loop effect
  const displaySponsors = [...normalizedSponsors, ...normalizedSponsors];

  return (
    <div className={cn("w-full py-8 overflow-hidden", className)}>
      {title && (
         <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-border" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {title}
            </h3>
            <div className="h-px flex-1 bg-border" />
        </div>
      )}
      
      <div className="relative flex overflow-hidden">
        <div className="flex gap-8 md:gap-12 items-center animate-scroll hover:[animation-play-state:paused] whitespace-nowrap min-w-full">
          {displaySponsors.map((sponsor, idx) => (
            <div 
              key={idx} 
              className="relative flex-shrink-0 w-32 h-20 md:w-40 md:h-24 transition-all duration-300 filter grayscale hover:grayscale-0 opacity-70 hover:opacity-100 hover:scale-105"
              title={sponsor.name}
            >
              <Image
                src={sponsor.url}
                alt={sponsor.name || `Aliado ${idx + 1}`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 128px, 160px"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
