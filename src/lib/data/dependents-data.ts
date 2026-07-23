import 'server-only';
import { adminDb } from '../firebase/server';
import { Dependent } from '../types';
import { unstable_noStore as noStore } from 'next/cache';

/**
 * Fetches a single dependent by their ID from a tutor's subcollection.
 * @param tutorId - The ID of the parent/tutor user.
 * @param dependentId - The ID of the dependent document.
 * @returns The dependent object or null if not found.
 */
export async function getDependentById(tutorId: string, dependentId: string): Promise<Dependent | null> {
    noStore();
    if (!tutorId || !dependentId) {
        return null;
    }

    try {
        const dependentDoc = await adminDb
            .collection('users')
            .doc(tutorId)
            .collection('dependents')
            .doc(dependentId)
            .get();

        if (!dependentDoc.exists) {
            console.warn(`Dependent with ID "${dependentId}" not found for tutor "${tutorId}".`);
            return null;
        }

        return { id: dependentDoc.id, ...dependentDoc.data() } as Dependent;
    } catch (error) {
        console.error(`Error fetching dependent "${dependentId}" for tutor "${tutorId}":`, error);
        return null; // Return null on error
    }
}
