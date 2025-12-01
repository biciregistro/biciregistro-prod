'use server';

import { revalidatePath } from 'next/cache';
import { getDecodedSession } from '@/lib/auth';
import { getEventRegistration, updateRegistrationManualPayment, updateRegistrationStatusInternal } from '@/lib/financial-data';
import { getEvent, updateEvent, getAuthenticatedUser } from '@/lib/data';
import { PaymentStatus } from '@/lib/types';
import { createPreference } from '@/lib/mercadopago';

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

/**
 * Server Action para iniciar el flujo de pago con Mercado Pago
 */
export async function createPaymentPreferenceAction(eventId: string, registrationId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { success: false, error: "Debes iniciar sesión para realizar un pago." };
    }

    try {
        // 1. Obtener detalles del registro
        const registration = await getEventRegistration(registrationId);
        if (!registration) {
            return { success: false, error: "Registro no encontrado." };
        }

        // Validar propiedad del registro
        if (registration.userId !== session.uid) {
            return { success: false, error: "No tienes permiso para pagar este registro." };
        }

        // Validar estado del pago
        if (registration.paymentStatus === 'paid') {
            return { success: false, error: "Este registro ya ha sido pagado." };
        }

        // 2. Obtener detalles del evento
        const event = await getEvent(eventId);
        if (!event) {
            return { success: false, error: "Evento no encontrado." };
        }

        // 3. Determinar el precio y el nombre del item
        let price = registration.price;
        let title = `Inscripción: ${event.name}`;

        // Si el precio no está en el registro (legacy), intentar obtenerlo del tier
        if (!price && registration.tierId && event.costTiers) {
            const tier = event.costTiers.find(t => t.id === registration.tierId);
            if (tier) {
                price = tier.price;
                title = `Inscripción: ${event.name} (${tier.name})`;
            }
        }

        if (!price || price <= 0) {
            return { success: false, error: "No se pudo determinar el precio a pagar." };
        }

        // 4. Obtener datos del usuario para el pagador
        const user = await getAuthenticatedUser(); // Usa la cookie de sesión actual
        
        // Construir URLs de retorno dinámicas
        // NOTA: Se usa una URL base por defecto si la variable de entorno no está definida
        // Es crucial configurar NEXT_PUBLIC_BASE_URL en producción
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biciregistro.mx'; 
        // CORRECCIÓN: Apuntar al Dashboard
        const backUrl = `${baseUrl}/dashboard/events/${eventId}`;

        // 5. Crear Preferencia en Mercado Pago
        const initPoint = await createPreference({
            title: title,
            quantity: 1,
            unit_price: price,
            metadata: {
                eventId: eventId,
                userId: session.uid,
                registrationId: registrationId
            },
            backUrls: {
                success: backUrl,
                failure: backUrl,
                pending: backUrl
            },
            payer: {
                email: user?.email || session.email || 'unknown@email.com',
                name: user?.name || 'Participante',
                surname: user?.lastName
            }
        });

        if (!initPoint) {
             return { success: false, error: "Error al generar el link de pago." };
        }

        return { success: true, url: initPoint };

    } catch (error) {
        console.error("Error en createPaymentPreferenceAction:", error);
        return { success: false, error: "Ocurrió un error inesperado al iniciar el pago." };
    }
}

/**
 * Verifica activamente el estado de un pago en Mercado Pago y actualiza la DB
 * Se usa como fallback cuando los webhooks fallan.
 */
export async function verifyPaymentAction(paymentId: string): Promise<{ success: boolean; error?: string }> {
    // No requerimos sesión obligatoria estricta, cualquier usuario con el ID de pago válido
    // debería poder gatillar la actualización si el pago es real y aprobado.
    
    try {
        const accessToken = process.env.MP_ACCESS_TOKEN;
        if (!accessToken) {
             throw new Error("MP_ACCESS_TOKEN faltante");
        }

        const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            cache: 'no-store'
        });

        if (!res.ok) {
            console.error("Error verificando pago en MP:", await res.text());
            return { success: false, error: "No se pudo verificar el pago." };
        }

        const paymentData = await res.json();
        
        if (paymentData.status === 'approved') {
            const metadata = paymentData.metadata;
            const registrationId = metadata?.registration_id;

            if (registrationId) {
                // Actualizar DB
                await updateRegistrationStatusInternal(registrationId, {
                    paymentStatus: 'paid',
                    paymentMethod: 'platform'
                });
                
                // Revalidar path del dashboard y admin
                const eventId = metadata?.event_id;
                if (eventId) {
                    revalidatePath(`/dashboard/events/${eventId}`);
                    revalidatePath(`/dashboard/ong/events/${eventId}`);
                }
                
                return { success: true };
            }
        }
        
        return { success: false, error: "El pago no está aprobado o no corresponde." };

    } catch (error) {
        console.error("Error en verifyPaymentAction:", error);
        return { success: false, error: "Error interno al verificar pago." };
    }
}
