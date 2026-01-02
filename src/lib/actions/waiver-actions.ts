'use server';

import { getDecodedSession } from '@/lib/auth';
import { getRegistrationById } from '@/lib/data/event-registration-data';
import { getEvent } from '@/lib/data/core';
import type { EventRegistration, User } from '@/lib/types';

// Define the shape of the data returned by the action
export type WaiverDetails = {
    waiverText: string;
    signatureImage: string;
    participant: Pick<User, 'name' | 'lastName'>;
    event: { name: string };
    acceptedAt: string;
    registrationId: string;
    waiverIp?: string;   // New field
    waiverHash?: string; // New field
};

// Server Action to get the details of a signed waiver for PDF generation
export async function getWaiverDetailsAction(registrationId: string): Promise<{ success: true, data: WaiverDetails } | { success: false, error: string }> {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { success: false, error: "No autorizado. Debes iniciar sesión." };
    }

    // 1. Fetch the registration details
    const registration = await getRegistrationById(registrationId);
    if (!registration) {
        return { success: false, error: "No se encontró el registro." };
    }

    if (!registration.waiverSignature || !registration.waiverTextSnapshot || !registration.waiverAcceptedAt) {
        return { success: false, error: "Esta inscripción no tiene una responsiva firmada." };
    }

    // 2. Fetch the associated event to verify ownership
    const event = await getEvent(registration.eventId);
    if (!event) {
        return { success: false, error: "No se encontró el evento asociado." };
    }

    // 3. Authorization Check: User must be the ONG that organized the event or an Admin OR the participant themselves
    const isOrganizer = event.ongId === session.uid;
    const isAdmin = session.role === 'admin';
    const isParticipant = registration.userId === session.uid;

    if (!isOrganizer && !isAdmin && !isParticipant) {
        return { success: false, error: "No tienes permiso para ver esta responsiva." };
    }

    // 4. Fetch participant details (we need the name)
    // We already have user info in the session, but it's better to fetch the registered user's info
    const { getUser } = await import('@/lib/data/core');
    const participant = await getUser(registration.userId);

    if (!participant) {
        return { success: false, error: "No se encontró al participante." };
    }

    // 5. Assemble and return the data for the PDF
    const waiverDetails: WaiverDetails = {
        waiverText: registration.waiverTextSnapshot,
        signatureImage: registration.waiverSignature,
        participant: {
            name: participant.name,
            lastName: participant.lastName || '',
        },
        event: {
            name: event.name,
        },
        acceptedAt: registration.waiverAcceptedAt,
        registrationId: registration.id,
        waiverIp: registration.waiverIp,     // New field mapping
        waiverHash: registration.waiverHash, // New field mapping
    };

    return { success: true, data: waiverDetails };
}
