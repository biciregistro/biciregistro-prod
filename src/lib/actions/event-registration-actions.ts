'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getDecodedSession } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/server';
import { getEvent, getUser } from '@/lib/data'; 
import { getRegistrationById, registerUserToEvent } from '@/lib/data/event-registration-data';
import { CURRENT_PRIVACY_POLICY_VERSION, MARKETING_CONSENT_TEXT } from '@/lib/legal-constants';
import { sendRegistrationEmail } from '@/lib/email/resend-service';
import type { MarketingConsent, EventCategory } from '@/lib/types';
import crypto from 'crypto';

/**
 * Registra a un usuario en un evento.
 */
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
    waiverTextSnapshot?: string,
    marketingConsentGiven?: boolean,
    jerseyModel?: string,
    jerseySize?: string,
    allergies?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
    const session = await getDecodedSession();
    
    if (!session?.uid) {
        return { success: false, error: "Debes iniciar sesión para registrarte." };
    }

    const event = await getEvent(eventId);
    if (!event) return { success: false, error: "Evento no encontrado." };

    if (event.requiresEmergencyContact) {
        if (!emergencyContactName || !emergencyContactName.trim()) return { success: false, error: "El nombre del contacto de emergencia es obligatorio." };
        if (!emergencyContactPhone || !emergencyContactPhone.trim()) return { success: false, error: "El teléfono del contacto de emergencia es obligatorio." };
        if (!bloodType) return { success: false, error: "El tipo de sangre es obligatorio." };
        if (!insuranceInfo || !insuranceInfo.trim()) return { success: false, error: "La información de seguro es obligatoria (o 'Sin seguro')." };
    }
    if (event.requiresWaiver && !waiverSignature) return { success: false, error: "Debes firmar la carta responsiva para continuar." };
    if (event.hasJersey && (!jerseyModel || !jerseySize)) return { success: false, error: "Debes seleccionar un modelo y talla de jersey." };

    let marketingConsent: MarketingConsent | null = null;
    const headerList = await headers();
    const clientIp = headerList.get('x-forwarded-for') ?? headerList.get('x-real-ip') ?? 'IP_NOT_FOUND';

    if (marketingConsentGiven) {
        marketingConsent = {
            accepted: true,
            timestamp: new Date().toISOString(),
            ipAddress: clientIp,
            policyVersion: CURRENT_PRIVACY_POLICY_VERSION,
            legalText: MARKETING_CONSENT_TEXT,
        };
    }

    // --- Waiver Security Enhancement ---
    let waiverIp: string | undefined;
    let waiverHash: string | undefined;

    if (waiverSignature && waiverTextSnapshot && waiverAcceptedAt) {
        waiverIp = clientIp;
        const hashInput = `${session.uid}|${eventId}|${waiverAcceptedAt}|${waiverTextSnapshot}|${waiverIp}`;
        waiverHash = crypto.createHash('sha256').update(hashInput).digest('hex');
    }
    // ------------------------------------

    const registrationInput = {
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
        waiverTextSnapshot,
        waiverIp,    // New field
        waiverHash,  // New field
        marketingConsent,
        jerseyModel,
        jerseySize,
        allergies
    };

    const result = await registerUserToEvent(registrationInput);

    if (result.success) {
        revalidatePath(`/events/${eventId}`);
        revalidatePath(`/dashboard/events/${eventId}`);
        revalidatePath(`/dashboard/ong/events/${eventId}`);

        try {
            const [user, registration] = await Promise.all([
                getUser(session.uid),
                getRegistrationById(result.registrationId)
            ]);

            if (user && registration) {
                await sendRegistrationEmail({ event, user, registration });
            }
        } catch (emailError) {
            console.error(`[CRITICAL] Failed to send registration email for regId: ${result.registrationId}`, emailError);
        }

        return { success: true, message: result.message };
    } else {
        return { success: false, error: result.error };
    }
}

/**
 * Actualiza la categoría de una inscripción existente.
 */
export async function updateEventCategoryAction(
    registrationId: string,
    newCategoryId: string
): Promise<{ success: boolean; error?: string; message?: string }> {
    const session = await getDecodedSession();
    
    if (!session?.uid) {
        return { success: false, error: "No autorizado." };
    }

    try {
        const regRef = adminDb.collection('event-registrations').doc(registrationId);
        const regSnap = await regRef.get();
        
        if (!regSnap.exists) {
            return { success: false, error: "Registro no encontrado." };
        }

        const registration = regSnap.data();
        if (registration?.userId !== session.uid) {
            return { success: false, error: "No tienes permiso para modificar este registro." };
        }

        // Obtener el evento para validar la categoría
        const event = await getEvent(registration?.eventId);
        if (!event) return { success: false, error: "Evento no encontrado." };

        const category = event.categories?.find(c => c.id === newCategoryId);
        if (!category) {
            return { success: false, error: "La categoría seleccionada no es válida para este evento." };
        }

        // Actualizar
        await regRef.update({
            categoryId: newCategoryId,
            categoryName: category.name // Mantenemos redundancia para facilitar consultas/exports
        });

        revalidatePath(`/dashboard/events/${registration?.eventId}`);
        
        return { success: true, message: "Categoría actualizada correctamente." };

    } catch (error) {
        console.error("Error updating event category:", error);
        return { success: false, error: "Ocurrió un error al actualizar la categoría." };
    }
}
