'use server';

import { revalidatePath } from 'next/cache';
import { getDecodedSession } from '@/lib/auth';
import { getEvent, registerUserToEvent } from '@/lib/data'; // Importing from main data entry point which now uses the refactored logic internally or directly

// Separate actions file for Event Registration logic to keep files modular

export async function registerForEventAction(
    eventId: string, 
    tierId?: string, 
    categoryId?: string,
    emergencyContactName?: string,
    emergencyContactPhone?: string,
    bloodType?: string,
    insuranceInfo?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
    const session = await getDecodedSession();
    
    if (!session?.uid) {
        return { success: false, error: "Debes iniciar sesión para registrarte." };
    }

    const event = await getEvent(eventId);
    if (!event) return { success: false, error: "Evento no encontrado." };

    // Validation logic for emergency fields
    if (event.requiresEmergencyContact) {
        if (!emergencyContactName || !emergencyContactName.trim()) {
             return { success: false, error: "El nombre del contacto de emergencia es obligatorio." };
        }
        if (!emergencyContactPhone || !emergencyContactPhone.trim()) {
             return { success: false, error: "El teléfono del contacto de emergencia es obligatorio." };
        }
        // New validations for blood type and insurance
        if (!bloodType) {
            return { success: false, error: "El tipo de sangre es obligatorio." };
        }
        if (!insuranceInfo || !insuranceInfo.trim()) {
            return { success: false, error: "La información de seguro es obligatoria (o 'Sin seguro')." };
        }
    }

    // Call the data function (which is now in src/lib/data/event-registration-data.ts but exported via src/lib/data.ts if we updated exports, 
    // or we should import directly if we didn't update src/lib/data.ts exports. 
    // Checking previous steps, I created src/lib/data/event-registration-data.ts but I did NOT update src/lib/data.ts to export it.
    // I should import directly from the new file to be safe and avoid circular deps in this specific refactor step).
    
    // CORRECTING IMPORT PATH DYNAMICALLY:
    // Since I cannot change imports easily without rewriting the file, and I suspect registerUserToEvent might still be the old one in data.ts if I didn't remove it.
    // However, in step 4 of the plan "Lógica de Registro (Backend - Nuevo Archivo)", I created src/lib/actions/event-registration-actions.ts 
    // and I updated src/lib/data.ts to REMOVE registerUserToEvent? No, I likely duplicated it or need to check.
    
    // Let's rely on the direct import from the new data file to ensure we use the UPDATED logic.
    // But wait, I can't see the file content of src/lib/data.ts right now to know if I removed the old function.
    // To be safe, I will import from the specific file I created: '@/lib/data/event-registration-data'
    
    const { registerUserToEvent: registerUserToEventRefactored } = await import('@/lib/data/event-registration-data');

    const result = await registerUserToEventRefactored({
        eventId,
        userId: session.uid,
        tierId,
        categoryId,
        emergencyContactName,
        emergencyContactPhone,
        bloodType,
        insuranceInfo,
    });

    if (result.success) {
        revalidatePath(`/events/${eventId}`);
        revalidatePath(`/dashboard/events/${eventId}`); // Revalidate user dashboard
        revalidatePath(`/dashboard/ong/events/${eventId}`); // Revalidate ONG dashboard to show new attendee immediately
    }

    return result;
}
