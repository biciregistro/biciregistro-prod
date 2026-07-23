'use server';

import { getDecodedSession } from '@/lib/auth';
import { getRegistrationById } from '@/lib/data/event-registration-data';
import { getDependentById } from '@/lib/data/dependents-data'; // Import the new function
import { getEvent, getUser } from '@/lib/data/core';
import type { EventRegistration, User } from '@/lib/types';

// Define the shape of the data returned by the action
export type WaiverDetails = {
    waiverText: string;
    signatureImage: string;
    participant: { name: string; lastName: string; };
    event: { name: string };
    acceptedAt: string;
    registrationId: string;
    waiverIp?: string;
    waiverHash?: string;
    isTutorFlow: boolean;
    tutor?: { name: string; lastName: string; };
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

    // 3. Authorization Check: User must be the ONG that organized the event, an Admin, OR the participant/tutor.
    const isOrganizer = event.ongId === session.uid;
    const isAdmin = session.role === 'admin';
    const isOwner = registration.userId === session.uid;

    if (!isOrganizer && !isAdmin && !isOwner) {
        return { success: false, error: "No tienes permiso para ver esta responsiva." };
    }
    
    // 4. Conditional data fetching for participant and tutor
    if (registration.isMinorRegistration && registration.tutorId && registration.dependentId) {
        // --- TUTOR/DEPENDENT FLOW ---
        const tutor = await getUser(registration.tutorId);
        const dependent = await getDependentById(registration.tutorId, registration.dependentId);

        if (!tutor) return { success: false, error: "No se encontró al tutor asociado a la inscripción." };
        if (!dependent) return { success: false, error: "No se encontró al menor asociado a la inscripción." };

        const waiverDetails: WaiverDetails = {
            waiverText: registration.waiverTextSnapshot,
            signatureImage: registration.waiverSignature,
            participant: {
                name: dependent.firstName,
                lastName: dependent.lastName,
            },
            tutor: {
                name: tutor.name,
                lastName: tutor.lastName || '',
            },
            event: { name: event.name },
            acceptedAt: registration.waiverAcceptedAt,
            registrationId: registration.id,
            waiverIp: registration.waiverIp,
            waiverHash: registration.waiverHash,
            isTutorFlow: true,
        };
        return { success: true, data: waiverDetails };

    } else {
        // --- ADULT PARTICIPANT FLOW ---
        const participant = await getUser(registration.userId);
        if (!participant) {
            return { success: false, error: "No se encontró al participante." };
        }

        const waiverDetails: WaiverDetails = {
            waiverText: registration.waiverTextSnapshot,
            signatureImage: registration.waiverSignature,
            participant: {
                name: participant.name,
                lastName: participant.lastName || '',
            },
            event: { name: event.name },
            acceptedAt: registration.waiverAcceptedAt,
            registrationId: registration.id,
            waiverIp: registration.waiverIp,
            waiverHash: registration.waiverHash,
            isTutorFlow: false,
        };
        return { success: true, data: waiverDetails };
    }
}
