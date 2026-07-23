'use server';

import { z } from 'zod';
import { getDecodedSession } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/server';
import { dependentFormSchema } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';
import type { Dependent } from '@/lib/types';

/**
 * Creates or updates a dependent for the logged-in user.
 * @param formData - The dependent's data.
 * @param dependentId - Optional. If provided, updates the existing dependent.
 * @returns An object with success status and either the dependent's ID or an error message.
 */
export async function saveDependentAction(
    formData: z.infer<typeof dependentFormSchema>,
    dependentId?: string
): Promise<{ success: boolean; error?: string; dependentId?: string; }> {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { success: false, error: 'Authentication required.' };
    }

    const validatedFields = dependentFormSchema.safeParse(formData);
    if (!validatedFields.success) {
        return {
            success: false,
            error: validatedFields.error.errors.map((e) => e.message).join(', '),
        };
    }

    const { firstName, lastName, dateOfBirth, gender, bloodType, allergies } = validatedFields.data;

    try {
        const dependentsCollection = adminDb.collection('users').doc(session.uid).collection('dependents');
        
        let docId = dependentId;
        const [day, month, year] = dateOfBirth.split('/');
        const birthDateAsDate = new Date(`${year}-${month}-${day}`);

        const dependentData = {
            tutorId: session.uid,
            firstName,
            lastName,
            dateOfBirth: birthDateAsDate,
            gender,
            bloodType,
            allergies: allergies || '',
        };

        if (docId) {
            // Update existing dependent
            await dependentsCollection.doc(docId).update(dependentData);
        } else {
            // Create new dependent
            const newDocRef = await dependentsCollection.add(dependentData);
            docId = newDocRef.id;
        }

        // Revalidate paths to reflect new data
        revalidatePath('/profile');
        revalidatePath('/dashboard');
        revalidatePath('/events');

        return { success: true, dependentId: docId };

    } catch (error) {
        console.error('Error saving dependent:', error);
        return { success: false, error: 'A server error occurred while saving the dependent.' };
    }
}
