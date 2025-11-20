import { MetadataRoute } from 'next';
import { getAllBikeSerials } from '@/lib/data';

// The base URL should ideally come from an environment variable,
// ensuring it's correct for different environments (dev, prod).
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Get all bike serial numbers
  const bikeSerials = await getAllBikeSerials();

  // 2. Create the dynamic routes for each bike
  const bikeUrls = bikeSerials.map(serial => ({
    url: `${BASE_URL}/bikes/${serial}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // 3. Define the static routes
  const staticUrls = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 1,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    {
        url: `${BASE_URL}/login`,
        lastModified: new Date(),
        changeFrequency: 'yearly' as const,
        priority: 0.5,
    },
    {
        url: `${BASE_URL}/signup`,
        lastModified: new Date(),
        changeFrequency: 'yearly' as const,
        priority: 0.5,
    },
  ];

  // 4. Combine and return
  return [...staticUrls, ...bikeUrls];
}
