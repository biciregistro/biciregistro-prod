"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getAuthenticatedUser } from "@/lib/data";
import { createEvent, updateEvent } from "@/lib/data";
import { ongProfileSchema, financialProfileSchema, eventFormSchema } from "@/lib/schemas";
import { adminDb as db } from "@/lib/firebase/server";
import { updateOngFinancialData } from "@/lib/financial-data";
import type { ActionFormState, Event } from "@/lib/types";


export async function updateOngProfile(values: z.infer<typeof ongProfileSchema>) {
    const user = await getAuthenticatedUser();

    if (!user || user.role !== "ong") {
        return { success: false, message: "No autorizado." };
    }

    const validatedFields = ongProfileSchema.safeParse(values);

    if (!validatedFields.success) {
        return { success: false, message: "Datos inválidos." };
    }

    try {
        const userId = user.id;

        // 1. Prepare data for 'ong-profiles' collection
        const ongProfileData = {
            ...validatedFields.data,
            id: userId,
        };

        const ongProfileRef = db.collection("ong-profiles").doc(userId);
        await ongProfileRef.set(ongProfileData, { merge: true });

        // 2. Prepare data for 'users' collection (Critical for Header/Layout sync)
        const userData = {
            name: validatedFields.data.organizationName, // MAP ORGANIZATION NAME TO USER NAME
            avatarUrl: validatedFields.data.logoUrl || "", // MAP LOGO TO AVATAR
            logoUrl: validatedFields.data.logoUrl || "",
            country: validatedFields.data.country,
            state: validatedFields.data.state,
            whatsapp: validatedFields.data.contactWhatsapp, 
        };

        const userDocRef = db.collection("users").doc(userId);
        await userDocRef.set(userData, { merge: true });

        // 3. Revalidate paths
        revalidatePath("/dashboard/ong");
        revalidatePath("/dashboard/ong/profile");
        revalidatePath("/", "layout");

        return { success: true, message: "Perfil actualizado correctamente." };
    } catch (error) {
        console.error("Error updating ONG profile:", error);
        return { success: false, message: "Ocurrió un error al actualizar el perfil." };
    }
}

export async function saveOngFinancialsAction(prevState: any, formData: FormData) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'ong') {
        return { error: 'No tienes permisos para realizar esta acción.' };
    }

    const validatedFields = financialProfileSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            error: 'Datos inválidos. Verifica que la CLABE tenga 18 dígitos numéricos.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    try {
        await updateOngFinancialData(user.id, validatedFields.data);
        revalidatePath('/dashboard/ong/profile');
        return { success: true, message: 'Datos bancarios guardados correctamente.' };
    } catch (error) {
        console.error("Error saving ONG financials:", error);
        return { error: 'Ocurrió un error al guardar los datos bancarios.' };
    }
}

export async function saveEvent(eventData: any, isDraft: boolean): Promise<ActionFormState & { eventId?: string }> {
    const user = await getAuthenticatedUser();
    if (!user || (user.role !== 'ong' && user.role !== 'admin')) {
        return { error: 'No estás autenticado o no tienes permisos.' };
    }

    const validatedFields = eventFormSchema.safeParse(eventData);

    if (!validatedFields.success) {
        return {
            error: 'Datos del evento no válidos. Revisa los campos marcados.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const data = validatedFields.data;
    const status = isDraft ? 'draft' : 'published';

    try {
        let eventId = eventData.id;
        
        const payload: Omit<Event, 'id'> = {
            ongId: user.id,
            status: status,
            ...data,
            costTiers: data.costTiers || [],
            bibNumberConfig: data.bibNumberConfig ? {
                enabled: data.bibNumberConfig.enabled,
                mode: data.bibNumberConfig.mode,
                nextNumber: data.bibNumberConfig.nextNumber ?? 1
            } : undefined
        };

        if (eventId) {
            await updateEvent(eventId, payload);
        } else {
            eventId = await createEvent(payload);
        }
        
        // Revalidate Dashboard Paths
        revalidatePath('/dashboard/ong');
        revalidatePath(`/dashboard/ong/events/${eventId}`);
        
        // Revalidate Public Event Page
        revalidatePath(`/events/${eventId}`);

        if (user.role === 'admin') {
             revalidatePath('/admin');
        }

        return { 
            success: true, 
            message: isDraft ? 'Borrador guardado.' : 'Evento publicado.',
            eventId: eventId
        };

    } catch (error: any) {
        console.error("Save event error:", error);
        return { error: 'Ocurrió un error al guardar el evento.' };
    }
}

export async function assignBibNumber(registrationId: string, eventId: string, number: number) {
    const user = await getAuthenticatedUser();
    
    if (!user) {
        return { success: false, message: "No autorizado." };
    }

    if (user.role !== 'ong' && user.role !== 'admin') {
        return { success: false, message: "No autorizado." };
    }
    
    // Check for duplicate number in the same event
    try {
        const existingRef = await db.collection('event-registrations')
            .where('eventId', '==', eventId)
            .where('bibNumber', '==', number)
            .get();

        if (!existingRef.empty) {
            // Check if it's the same registration (idempotency, though UI handles it)
            const doc = existingRef.docs[0];
            if (doc.id !== registrationId) {
                return { success: false, message: `El número ${number} ya está asignado a otro participante.` };
            }
        }

        await db.collection('event-registrations').doc(registrationId).update({
            bibNumber: number
        });
        
        revalidatePath(`/dashboard/ong/events/${eventId}`);
        // Also revalidate the public page so the user sees their number immediately if they check
        revalidatePath(`/events/${eventId}`);
        
        return { success: true };
    } catch (error) {
        console.error("Error assigning bib number:", error);
        return { success: false, message: "Error de base de datos." };
    }
}
