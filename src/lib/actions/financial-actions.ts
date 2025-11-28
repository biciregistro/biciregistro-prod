'use server';

import { revalidatePath } from 'next/cache';
import { getDecodedSession } from '@/lib/auth';
import { getEventRegistration, updateRegistrationManualPayment } from '@/lib/financial-data';
import { getEvent, updateEvent } from '@/lib/data';

export async function registerManualPaymentAction(registrationId: string, eventId: string): Promise<{ success: boolean; error?: string }> {
    const session = await getDecodedSession();
    if (!session?.uid || session.role !== 'ong') {
        return { success: false, error: "No tienes permiso para realizar esta acción." };
    }

    try {
        const registration = await getEventRegistration(registrationId);
        if (!registration) return { success: false, error: "Inscripción no encontrada." };
        if (registration.eventId !== eventId) return { success: false, error: "ID de evento no coincide." };

        if (registration.paymentStatus === 'paid') {
             return { success: false, error: "Esta inscripción ya está pagada." };
        }

        // Calculate Fee debt
        let fee = registration.feeAmount || 0;
        
        if (fee === 0 && registration.tierId) {
            const event = await getEvent(eventId);
            if (event?.costTiers) {
                const tier = event.costTiers.find(t => t.id === registration.tierId);
                if (tier?.fee) {
                    fee = tier.fee;
                }
            }
        }

        await updateRegistrationManualPayment(registrationId, fee);
        
        revalidatePath(`/dashboard/ong/events/${eventId}`);
        return { success: true };
    } catch (error) {
        console.error("Error registering manual payment:", error);
        return { success: false, error: "Error interno al registrar pago." };
    }
}

export async function toggleEventBlockAction(eventId: string, isBlocked: boolean): Promise<{ success: boolean; error?: string }> {
    const session = await getDecodedSession();
    if (!session?.uid || session.admin !== true) {
        return { success: false, error: "No tienes permisos de administrador." };
    }

    try {
        await updateEvent(eventId, { isBlocked });
        revalidatePath(`/admin/events/${eventId}`);
        revalidatePath(`/dashboard/ong/events/${eventId}`);
        return { success: true };
    } catch (error) {
        console.error("Error blocking event:", error);
        return { success: false, error: "Error al actualizar el estado de bloqueo." };
    }
}
