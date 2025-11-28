'use server';

import { revalidatePath } from 'next/cache';
import { getDecodedSession } from '@/lib/auth';
import { getEventRegistration, updateRegistrationManualPayment, updateRegistrationStatusInternal } from '@/lib/financial-data';
import { getEvent, updateEvent } from '@/lib/data';
import { PaymentStatus } from '@/lib/types';

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

        // Calculate Fee & Price if not present
        let fee = registration.feeAmount || 0;
        let price = registration.price || 0;
        
        if ((fee === 0 || price === 0) && registration.tierId) {
            const event = await getEvent(eventId);
            if (event?.costTiers) {
                const tier = event.costTiers.find(t => t.id === registration.tierId);
                if (tier) {
                    if (fee === 0 && tier.fee) fee = tier.fee;
                    if (price === 0) price = tier.price;
                }
            }
        }

        await updateRegistrationManualPayment(registrationId, fee, price);
        
        revalidatePath(`/dashboard/ong/events/${eventId}`);
        return { success: true };
    } catch (error) {
        console.error("Error registering manual payment:", error);
        return { success: false, error: "Error interno al registrar pago." };
    }
}

export async function updateRegistrationPaymentStatusAction(registrationId: string, eventId: string, newStatus: PaymentStatus): Promise<{ success: boolean; error?: string }> {
    const session = await getDecodedSession();
    if (!session?.uid || (session.role !== 'ong' && session.admin !== true)) {
        return { success: false, error: "No tienes permiso para realizar esta acción." };
    }

    try {
        const updateData: any = { paymentStatus: newStatus };
        
        if (newStatus === 'paid') {
            updateData.paymentMethod = 'platform';
        } else {
            // Explicitly clear paymentMethod if status is not paid (e.g., reverting to pending)
            // In Firestore update, we can use FieldValue.delete() but since I cannot import it here easily without admin SDK,
            // setting to null is a safe alternative if the type allows it, or just ignoring it.
            // Let's use null which updateRegistrationStatusInternal will clean if we don't handle it, 
            // but wait, updateRegistrationStatusInternal filters undefined. Null is valid json.
            updateData.paymentMethod = null; 
        }

        await updateRegistrationStatusInternal(registrationId, updateData);
        
        revalidatePath(`/dashboard/ong/events/${eventId}`);
        return { success: true };
    } catch (error) {
        console.error("Error updating payment status:", error);
        return { success: false, error: "Error al actualizar el estado de pago." };
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
