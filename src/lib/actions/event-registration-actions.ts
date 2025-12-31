'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getDecodedSession } from '@/lib/auth';
import { getEvent, getUser } from '@/lib/data'; 
import { getRegistrationById, registerUserToEvent } from '@/lib/data/event-registration-data';
import { CURRENT_PRIVACY_POLICY_VERSION, MARKETING_CONSENT_TEXT } from '@/lib/legal-constants';
import { sendRegistrationEmail } from '@/lib/email/resend-service';
import type { MarketingConsent } from '@/lib/types';

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
    if (marketingConsentGiven) {
        const headerList = await headers();
        const ip = headerList.get('x-forwarded-for') ?? headerList.get('x-real-ip') ?? 'IP_NOT_FOUND';
        marketingConsent = {
            accepted: true,
            timestamp: new Date().toISOString(),
            ipAddress: ip,
            policyVersion: CURRENT_PRIVACY_POLICY_VERSION,
            legalText: MARKETING_CONSENT_TEXT,
        };
    }

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

        // --- EMAIL SENDING LOGIC ---
        try {
            const [user, registration] = await Promise.all([
                getUser(session.uid),
                getRegistrationById(result.registrationId)
            ]);

            if (user && registration) {
                await sendRegistrationEmail({ event, user, registration });
            } else {
                console.error(`[Email Error] Could not fetch user or registration after creation for regId: ${result.registrationId}`);
            }
        } catch (emailError) {
            // IMPORTANT: Do not block the user flow if email fails. Just log it.
            console.error(`[CRITICAL] Failed to send registration email for regId: ${result.registrationId}`, emailError);
        }

        return { success: true, message: result.message };
    } else {
        return { success: false, error: result.error };
    }
}
