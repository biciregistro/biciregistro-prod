'use server';

import { z } from 'zod';
import { adminDb as db } from '@/lib/firebase/server';
import type { Bike, BikeComponents } from '@/lib/types';

const componentFilterDataSchema = z.object({
  categories: z.array(z.object({ value: z.string(), label: z.string() })),
  brands: z.array(z.object({ value: z.string(), label: z.string() })),
  models: z.array(z.object({ value: z.string(), label: z.string() })),
});

export type ComponentFilterData = z.infer<typeof componentFilterDataSchema>;

// Helper to capitalize strings
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function getComponentFilterData(
    filters: {
        category?: string | null;
        brand?: string | null;
    }
): Promise<ComponentFilterData> {
    console.log('Fetching real component filter data with filters:', filters);

    const bikesSnapshot = await db.collection('bikes').select('components').get();
    const bikes = bikesSnapshot.docs.map((doc: any) => ({ ...doc.data() } as Bike));

    const allCategories = new Set<string>();
    const brandsByCategory: Record<string, Set<string>> = {};
    const modelsByBrand: Record<string, Record<string, Set<string>>> = {};

    for (const bike of bikes) {
        if (!bike.components) continue;

        for (const category in bike.components) {
            const component = bike.components[category as keyof BikeComponents];
            if (component && component.brand) {
                // Add category
                allCategories.add(category);
                
                // Add brand
                if (!brandsByCategory[category]) {
                    brandsByCategory[category] = new Set();
                }
                brandsByCategory[category].add(component.brand);

                // Add model
                if (component.model) {
                    if (!modelsByBrand[category]) {
                        modelsByBrand[category] = {};
                    }
                    if (!modelsByBrand[category][component.brand]) {
                        modelsByBrand[category][component.brand] = new Set();
                    }
                    modelsByBrand[category][component.brand].add(component.model);
                }
            }
        }
    }

    const categories = Array.from(allCategories)
        .sort()
        .map(c => ({ value: c, label: capitalize(c) }));

    let brands: { value: string, label: string }[] = [];
    if (filters.category && brandsByCategory[filters.category]) {
        brands = Array.from(brandsByCategory[filters.category])
            .sort()
            .map(b => ({ value: b, label: capitalize(b) }));
    }

    let models: { value: string, label: string }[] = [];
    if (filters.category && filters.brand && modelsByBrand[filters.category]?.[filters.brand]) {
        models = Array.from(modelsByBrand[filters.category][filters.brand])
            .sort()
            .map(m => ({ value: m, label: capitalize(m) }));
    }

    return {
        categories,
        brands,
        models,
    };
}
