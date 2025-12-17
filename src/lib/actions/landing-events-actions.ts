'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { landingEventsContentSchema } from '@/lib/schemas';
import { saveLandingEventsContent } from '@/lib/data/landing-events-data';
import { LandingEventsContent } from '../types';
import { getAuthenticatedUser } from '../data'; // Corrected import

export type LandingEventsFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
} | null;

class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Server Action to update the Events Manager landing page content.
 * @param prevState The previous state of the form.
 * @param formData The FormData object from the form submission.
 */
export async function updateLandingEventsContent(
  prevState: LandingEventsFormState,
  formData: FormData
): Promise<LandingEventsFormState> {
  try {
    // 1. Authentication and Authorization
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'admin') {
      throw new UnauthorizedError('No tienes permiso para realizar esta acción.');
    }

    // 2. Data Transformation and Validation
    // This part is complex because FormData is flat. We need to reconstruct the nested object.
    const contentObject = formDataToNestedObject(formData);
    
    const validationResult = landingEventsContentSchema.safeParse(contentObject);

    if (!validationResult.success) {
      console.error('Validation Errors:', validationResult.error.flatten().fieldErrors);
      return {
        success: false,
        message: 'Error de validación. Por favor, revisa los campos.',
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    // 3. Save to Database
    await saveLandingEventsContent(validationResult.data as LandingEventsContent);

    // 4. Revalidate Cache and Return Success
    revalidatePath('/events-manager'); // Invalidate the public page cache
    revalidatePath('/admin'); // Invalidate the admin page cache

    return {
      success: true,
      message: 'El contenido de la página de Events Manager ha sido actualizado con éxito.',
    };

  } catch (error: any) {
    console.error("Error updating landing page content:", error);
    if (error instanceof UnauthorizedError) {
        return { success: false, message: error.message };
    }
    return {
      success: false,
      message: 'Ocurrió un error en el servidor. Por favor, inténtalo de nuevo.',
    };
  }
}

/**
 * Converts a flat FormData object into the nested LandingEventsContent structure.
 * This is necessary because forms submit data in a key-value format.
 * @param formData The FormData from the form.
 */
function formDataToNestedObject(formData: FormData): any {
    const obj: any = {};

    // Helper to set nested properties
    const setProperty = (path: string, value: any) => {
        let schema = obj;
        const pList = path.split('.');
        const len = pList.length;
        for (let i = 0; i < len - 1; i++) {
            const elem = pList[i];
            if (!schema[elem]) schema[elem] = {};
            schema = schema[elem];
        }
        schema[pList[len - 1]] = value;
    };
    
    // Process regular fields
    for (const [key, value] of formData.entries()) {
        if (!key.includes('points[') && !key.includes('solutions[') && !key.includes('allies[')) {
            setProperty(key, value);
        }
    }

    // Reconstruct arrays of objects (pain points, solutions, allies)
    const reconstructArray = (prefix: string) => {
        const items: any[] = [];
        const keys = [...formData.keys()].filter(k => k.startsWith(prefix));
        const indices = [...new Set(keys.map(k => k.match(/\d+/)?.[0]))];

        for (const index of indices) {
            if (index === undefined) continue;
            const item: any = {};
            const itemKeys = keys.filter(k => k.includes(`[${index}]`));
            for (const key of itemKeys) {
                const fieldName = key.match(/\[\d+\]\.(.*)$/)?.[1];
                if (fieldName) {
                    item[fieldName] = formData.get(key);
                }
            }
            if (Object.keys(item).length > 0) {
               items[parseInt(index)] = item;
            }
        }
        return items.filter(Boolean); // Clean up any empty slots
    };

    // Ensure paths exist before assigning
    if (!obj.painPointsSection) obj.painPointsSection = {};
    if (!obj.solutionSection) obj.solutionSection = {};
    if (!obj.socialProofSection) obj.socialProofSection = {};

    obj.painPointsSection.points = reconstructArray('painPointsSection.points');
    obj.solutionSection.solutions = reconstructArray('solutionSection.solutions');
    obj.socialProofSection.allies = reconstructArray('socialProofSection.allies');


    // Ensure arrays have the correct length for tuple validation
    if (obj.painPointsSection.points.length !== 3) {
      obj.painPointsSection.points = [{}, {}, {}]; // Invalidate on purpose if data is missing
    }
    if (obj.solutionSection.solutions.length !== 3) {
      obj.solutionSection.solutions = [{}, {}, {}]; // Invalidate on purpose if data is missing
    }


    return obj;
}
