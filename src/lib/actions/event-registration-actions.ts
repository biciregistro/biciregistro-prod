'use server';

import { revalidatePath } from 'next/cache';
import { getDecodedSession } from '@/lib/auth';
import { getEvent } from '@/lib/data'; 
import { registerUserToEvent } from '@/lib/data/event-registration-data';

// Separate actions file for Event Registration logic to keep files modular

export async function registerForEventAction(
    eventId: string, 
    tierId?: string, 
    categoryId?: string,
    emergencyContactName?: string,
    emergencyContactPhone?: string,
    bloodType?: string,
    insuranceInfo?: string,
    waiverSignature?: string,
    waiverAcceptedAt?: string,
    waiverTextSnapshot?: string
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

    // Validation logic for waiver (HU-LEGAL-002)
    if (event.requiresWaiver) {
        if (!waiverSignature) {
            return { success: false, error: "Debes firmar la carta responsiva para continuar." };
        }
    }

    const result = await registerUserToEvent({
        eventId,
        userId: session.uid,
        tierId,
        categoryId,
        emergencyContactName,
        emergencyContactPhone,
        bloodType,
        insuranceInfo,
        waiverSignature,
        waiverAcceptedAt,
        waiverTextSnapshot
    });

    if (result.success) {
        revalidatePath(`/events/${eventId}`);
        revalidatePath(`/dashboard/events/${eventId}`); // Revalidate user dashboard
        revalidatePath(`/dashboard/ong/events/${eventId}`); // Revalidate ONG dashboard to show new attendee immediately
    }

    return result;
}
