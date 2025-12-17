'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { 
    landingEventsHeroSchema,
    landingEventsPainPointsSectionSchema,
    landingEventsSolutionSectionSchema,
    landingEventsFeatureSchema,
    landingEventsSocialProofSectionSchema,
    landingEventsCtaSchema
} from '@/lib/schemas/landing-events';
// Renamed function to bust cache
import { saveLandingSection } from '@/lib/data/landing-events-data'; 
import { getAuthenticatedUser } from '../data';

export type SectionFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[] | undefined>; // Allow undefined values
} | null;

class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

async function validateAdmin() {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'admin') {
      throw new UnauthorizedError('No tienes permiso para realizar esta acción.');
    }
}

async function updateSection<T>(
    sectionKey: string,
    schema: z.ZodType<T>,
    formData: FormData,
    revalidatePaths: string[] = ['/events-manager', '/admin']
): Promise<SectionFormState> {
    try {
        await validateAdmin();
        
        const dataToValidate = formDataToSectionObject(formData, sectionKey);

        const validationResult = schema.safeParse(dataToValidate);

        if (!validationResult.success) {
            console.error(`Validation Errors for ${sectionKey}:`, validationResult.error.flatten().fieldErrors);
            return {
                success: false,
                message: 'Error de validación. Por favor, revisa los campos.',
                errors: validationResult.error.flatten().fieldErrors,
            };
        }

        await saveLandingSection(sectionKey as any, validationResult.data);

        revalidatePaths.forEach(path => revalidatePath(path));

        return {
            success: true,
            message: 'Sección actualizada con éxito.',
        };

    } catch (error: any) {
        console.error(`Error updating ${sectionKey}:`, error);
        if (error instanceof UnauthorizedError) {
            return { success: false, message: error.message };
        }
        return {
            success: false,
            message: 'Ocurrió un error en el servidor.',
        };
    }
}


// --- Specific Actions ---

export async function updateHeroSection(prevState: SectionFormState, formData: FormData) {
    return updateSection('hero', landingEventsHeroSchema, formData);
}

export async function updatePainPointsSection(prevState: SectionFormState, formData: FormData) {
    return updateSection('painPointsSection', landingEventsPainPointsSectionSchema, formData);
}

export async function updateSolutionSection(prevState: SectionFormState, formData: FormData) {
    return updateSection('solutionSection', landingEventsSolutionSectionSchema, formData);
}

export async function updateFeatureSection(prevState: SectionFormState, formData: FormData) {
    return updateSection('featureSection', landingEventsFeatureSchema, formData);
}

export async function updateSocialProofSection(prevState: SectionFormState, formData: FormData) {
    return updateSection('socialProofSection', landingEventsSocialProofSectionSchema, formData);
}

export async function updateCtaSection(prevState: SectionFormState, formData: FormData) {
    return updateSection('ctaSection', landingEventsCtaSchema, formData);
}


// --- Helper: Reconstruct Object from FormData ---
function formDataToSectionObject(formData: FormData, sectionKey: string): any {
    const obj: any = {};
    
    // Helper specific for array reconstruction
    // Adjusted to accept inputs named with dot notation (e.g., points.0.title)
    const reconstructArray = (prefix: string) => {
        const items: any[] = [];
        
        // We look for keys that start with "prefix." (e.g., "points.")
        const prefixDot = prefix + '.';
        const keys = [...formData.keys()].filter(k => k.startsWith(prefixDot));
        
        // Extract indices: "points.0.title" -> "0"
        const indices = [...new Set(keys.map(k => {
            const afterPrefix = k.substring(prefixDot.length);
            return afterPrefix.split('.')[0]; // Gets "0" from "0.title"
        }))];

        for (const indexStr of indices) {
            const index = parseInt(indexStr);
            if (isNaN(index)) continue;

            const item: any = {};
            // Filter keys for this specific index: "points.0."
            const itemPrefix = `${prefixDot}${indexStr}.`;
            const itemKeys = keys.filter(k => k.startsWith(itemPrefix));

            for (const key of itemKeys) {
                // key example: points.0.title
                // fieldName should be "title"
                const fieldName = key.substring(itemPrefix.length);
                if (fieldName) {
                    item[fieldName] = formData.get(key);
                }
            }
             if (Object.keys(item).length > 0) {
               items[index] = item;
            }
        }
        return items.filter(Boolean);
    };


    if (sectionKey === 'painPointsSection') {
        const title = formData.get('title'); // Now just 'title'
        const points = reconstructArray('points'); // Now just 'points'
        return { title, points };
    }

    if (sectionKey === 'solutionSection') {
         const title = formData.get('title');
         const solutions = reconstructArray('solutions');
         return { title, solutions };
    }

    if (sectionKey === 'socialProofSection') {
        const allies = reconstructArray('allies');
        return { allies };
    }
    
    // For flat sections (hero, feature, cta)
    // Just grab all fields, assuming they match the schema keys directly
    for (const [key, value] of formData.entries()) {
        obj[key] = value;
    }

    return obj;
}
