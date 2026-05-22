"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

import { getAuthenticatedUser, getUserByEmail } from "@/lib/data";
import { createEvent, updateEvent, getEvent } from "@/lib/data";
import { ongProfileSchema, financialProfileSchema, eventFormSchema, wizardStep1Schema, wizardStep2Schema, wizardStep3Schema } from "@/lib/schemas";
import { adminDb as db } from "@/lib/firebase/server";
import { FieldValue } from 'firebase-admin/firestore';
import { updateOngFinancialData, getFinancialSettings } from "@/lib/financial-data";
import { calculateGrossUp, calculateFeeBreakdown, calculateAbsorbedFee } from "@/lib/utils";
import type { ActionFormState, Event, OngUser } from "@/lib/types";
import { sendShopSightingAlertEmail } from "@/lib/email/resend-service";

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
            error: 'Datos inválidos. Verifica los campos requeridos.',
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

// --- WIZARD ONBOARDING ACTIONS ---

export async function saveOnboardingStep(step: number, data: any) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "ong") return { success: false, error: "No autorizado." };

    try {
        let schema;
        if (step === 1) schema = wizardStep1Schema;
        if (step === 2) schema = wizardStep2Schema;
        if (step === 3) schema = wizardStep3Schema;

        if (!schema) return { success: false, error: "Paso inválido." };

        const validated = schema.safeParse(data);
        if (!validated.success) {
             return { success: false, error: "Datos inválidos.", details: validated.error.flatten().fieldErrors };
        }

        const cleanData = Object.fromEntries(Object.entries(validated.data).filter(([_, v]) => v !== undefined));
        
        // Special mapping for step 3
        if (step === 3) {
            const hasCost = (cleanData as any).hasCost;
            if (hasCost) {
                // If has cost, save financial data nested
                const financialData = {
                    bankName: (cleanData as any).bankName,
                    accountHolder: (cleanData as any).accountHolder,
                    clabe: (cleanData as any).clabe,
                    constanciaFiscalUrl: (cleanData as any).constanciaFiscalUrl
                };
                await db.collection("ong-profiles").doc(user.id).set({
                    financialData: financialData,
                    onboardingStep: 3
                }, { merge: true });
            } else {
                 // Clear financial data if they switched to free
                 await db.collection("ong-profiles").doc(user.id).set({
                    financialData: FieldValue.delete(),
                    onboardingStep: 3
                }, { merge: true });
            }
        } else {
            // Step 1 and 2
            await db.collection("ong-profiles").doc(user.id).set({
                ...cleanData,
                onboardingStep: step
            }, { merge: true });
        }

        return { success: true };
    } catch (error) {
        console.error("Error saving wizard step:", error);
        return { success: false, error: "Error interno del servidor." };
    }
}

export async function completeOngOnboarding() {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "ong") return { success: false, error: "No autorizado." };

    try {
        const profileDoc = await db.collection("ong-profiles").doc(user.id).get();
        if (!profileDoc.exists) return { success: false, error: "Perfil no encontrado." };
        
        const profileData = profileDoc.data() as Partial<OngUser>;

        // TRANSMUTACIÓN DE IDENTIDAD
        // El nombre de la ONG se convierte en el nombre del usuario (para Header/Emails)
        // El apellido se limpia.
        await db.collection('users').doc(user.id).update({
            name: profileData.organizationName || user.name,
            lastName: '',
            avatarUrl: profileData.logoUrl || user.avatarUrl || '',
            onboardingCompleted: true
        });

        // Limpiar el step temporal del profile
        await db.collection('ong-profiles').doc(user.id).update({
            onboardingStep: FieldValue.delete()
        });

        revalidatePath('/', 'layout');
        revalidatePath('/dashboard/ong');
        
        return { success: true };
    } catch (error) {
        console.error("Error completing onboarding:", error);
        return { success: false, error: "Error al finalizar configuración." };
    }
}


// --- EVENT MANAGEMENT ACTIONS ---

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
        
        // FINANCIAL SNAPSHOTTING: Fetch current settings to persist calculations
        const financialSettings = await getFinancialSettings();

        const processedTiers = data.costTiers?.map(tier => {
            if (data.costType === 'Gratuito') return tier;
            
            const val = Number(tier.price);
            let netPrice: number;
            let totalPrice: number;
            let fee: number;

            if (tier.absorbFee) {
                // ONG defined the FINAL public price
                const breakdown = calculateAbsorbedFee(val, financialSettings);
                totalPrice = val;
                netPrice = breakdown.netAmount;
                fee = breakdown.feeAmount;
            } else {
                // ONG defined their DESIRED net income
                totalPrice = calculateGrossUp(val, financialSettings);
                const breakdown = calculateFeeBreakdown(totalPrice, val);
                netPrice = val;
                fee = breakdown.feeAmount;
            }

            return {
                ...tier,
                price: totalPrice,   // Always store public price as the main 'price'
                netPrice: netPrice,  // Snapshot of what the ONG will receive
                fee: fee,            // Snapshot of the total service fee
                absorbFee: !!tier.absorbFee
            };
        }) || [];

        const payload: Omit<Event, 'id'> = {
            ongId: user.id,
            status: status,
            ...data,
            costTiers: processedTiers as any, // Use calculated tiers
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

export async function cloneEvent(originalEventId: string) {
    const user = await getAuthenticatedUser();
    if (!user || (user.role !== 'ong' && user.role !== 'admin')) {
        return { success: false, message: "No estás autenticado o no tienes permisos." };
    }

    try {
        const originalEvent = await getEvent(originalEventId);
        if (!originalEvent) {
            return { success: false, message: "El evento original no existe." };
        }

        // Check ownership if not admin
        if (user.role !== 'admin' && originalEvent.ongId !== user.id) {
            return { success: false, message: "No tienes permisos para clonar este evento." };
        }

        // Prepare new event data
        const { id, currentParticipants, pageViews, createdAt, registrationDeadline, ...eventData } = originalEvent as any;
        
        // Regenerate IDs for sub-collections within the document to avoid React key conflicts later
        const newCostTiers = eventData.costTiers?.map((tier: any) => ({
            ...tier,
            id: randomUUID()
        }));

        const newCategories = eventData.categories?.map((cat: any) => ({
            ...cat,
            id: randomUUID()
        }));
        
         const newJerseyConfigs = eventData.jerseyConfigs?.map((config: any) => ({
            ...config,
            id: randomUUID()
        }));

        const clonedEvent: Omit<Event, 'id'> = {
            ...eventData,
            name: `Copia de ${eventData.name}`,
            status: 'draft',
            currentParticipants: 0,
            pageViews: 0,
            costTiers: newCostTiers,
            categories: newCategories,
            jerseyConfigs: newJerseyConfigs,
            registrationDeadline: undefined, // Reset deadline
        };

        // Sanitize to remove undefined values which Firestore dislikes (JSON trick)
        const cleanPayload = JSON.parse(JSON.stringify(clonedEvent));

        const newEventId = await createEvent(cleanPayload);

        // Small delay to ensure consistency before redirection
        await new Promise(resolve => setTimeout(resolve, 500));

        revalidatePath('/dashboard/ong');
        
        return { 
            success: true, 
            message: "Evento clonado correctamente como borrador.",
            eventId: newEventId 
        };
    } catch (error) {
        console.error("Clone event error:", error);
        return { success: false, message: "Ocurrió un error al clonar el evento." };
    }
}

// --- B2B BIKE VALIDATION ACTIONS ---

// Helper interno para BI
function isExactMatch(biSerial: string | null | undefined, ourSerial: string): boolean {
    if (!biSerial) return false;
    const cleanBi = biSerial.replace(/[\s-]+/g, '').toUpperCase();
    const cleanOur = ourSerial.replace(/[\s-]+/g, '').toUpperCase();
    return cleanBi === cleanOur;
}

export async function validateBikeStatusAction(serialNumber: string) {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'ong') {
        return { success: false, error: 'No tienes permisos para realizar esta validación.' };
    }

    try {
        const cleanSerial = serialNumber.trim().toUpperCase();
        
        // 1. BÚSQUEDA LOCAL EN BICICLETAS REGISTRADAS
        const snapshot = await db.collection('bikes').where('serialNumber', '==', cleanSerial).limit(1).get();

        if (!snapshot.empty) {
            const bikeData = snapshot.docs[0].data();

            // Obtener nombre completo del dueño si no es anónimo
            let ownerName = 'Usuario Registrado';
            if (bikeData.userId) {
                const ownerDoc = await db.collection('users').doc(bikeData.userId).get();
                if (ownerDoc.exists) {
                    const oData = ownerDoc.data();
                    const fullName = [oData?.name, oData?.lastName].filter(Boolean).join(' ');
                    ownerName = fullName || 'Usuario Registrado';
                }
            }

            // Limpiador estricto para objetos Firebase Timestamp
            const parseDateString = (dateField: any): string | null => {
                if (!dateField) return null;
                if (typeof dateField.toDate === 'function') {
                    return dateField.toDate().toISOString(); 
                }
                if (typeof dateField === 'string') {
                    return new Date(dateField).toISOString();
                }
                if (dateField._seconds !== undefined) {
                     return new Date(dateField._seconds * 1000).toISOString();
                }
                return null;
            };

            const history = [];
            if (bikeData.createdAt) {
                const dateStr = parseDateString(bikeData.createdAt);
                if (dateStr) {
                    history.push({ 
                        event: bikeData.status === 'inventory' ? 'Registrada en inventario' : 'Registrada por ciclista', 
                        date: dateStr 
                    });
                }
            }
            if (bikeData.transferredAt) {
                const dateStr = parseDateString(bikeData.transferredAt);
                if (dateStr) {
                     history.push({ 
                        event: 'Transferida de tienda a ciclista', 
                        date: dateStr 
                    });
                }
            }

            let serializedTheftReport = bikeData.theftReport;
            if (serializedTheftReport && serializedTheftReport.date) {
                 const dateStr = parseDateString(serializedTheftReport.date);
                 if (dateStr) {
                     serializedTheftReport = {
                         ...serializedTheftReport,
                         date: dateStr
                     };
                 }
            }

            const rawResponse = {
                success: true,
                bike: {
                    id: snapshot.docs[0].id,
                    make: bikeData.make,
                    model: bikeData.model,
                    color: bikeData.color,
                    modality: bikeData.modality,
                    status: bikeData.status,
                    ownerId: bikeData.userId,
                    ownerName: ownerName,
                    theftReport: serializedTheftReport, 
                    history: history.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()),
                    isExternal: false
                }
            };
            return JSON.parse(JSON.stringify(rawResponse));
        }

        // 2. SI NO EXISTE LOCALMENTE, BUSCAR EN BIKE INDEX (SOLO ROBOS)
        let externalTheft = null;
        try {
            const cleanSerialForBi = cleanSerial.replace(/[\s-]+/g, '');
            const biUrl = `https://bikeindex.org/api/v3/search?serial=${encodeURIComponent(cleanSerialForBi)}&stolenness=stolen`;
            
            const biRes = await fetch(biUrl, { next: { revalidate: 3600 } }); // Cache 1 hour
            
            if (biRes.ok) {
                const biData = await biRes.json();
                if (biData.bikes && biData.bikes.length > 0) {
                    const stolenBike = biData.bikes.find((b: any) => 
                        b.stolen && isExactMatch(b.serial, cleanSerialForBi)
                    );

                    if (stolenBike) {
                        externalTheft = {
                            id: `bi_${stolenBike.id}`,
                            make: stolenBike.manufacturer_name || 'Desconocida',
                            model: stolenBike.frame_model || 'Desconocido',
                            color: stolenBike.frame_colors?.join(', ') || 'Desconocido',
                            modality: 'N/A', // Bike Index no clasifica por modalidad de la misma forma
                            status: 'stolen',
                            ownerId: null, // No tenemos el ID local para mandar correo
                            ownerName: 'Registrado en Bike Index',
                            theftReport: {
                                date: stolenBike.date_stolen ? new Date(stolenBike.date_stolen * 1000).toISOString() : null,
                                city: stolenBike.stolen_location || 'Ubicación Desconocida',
                                state: 'Internacional',
                                details: `Reporte importado desde la base de datos internacional de Bike Index. URL: ${stolenBike.url}`
                            },
                            history: [{
                                event: 'Reportada robada en Bike Index',
                                date: stolenBike.date_stolen ? new Date(stolenBike.date_stolen * 1000).toISOString() : new Date().toISOString()
                            }],
                            isExternal: true, // Bandera para la UI
                            biUrl: stolenBike.url // Para que puedan ver el reporte original
                        };
                    }
                }
            }
        } catch (e) {
            console.error("Error consultando Bike Index desde modal ONG:", e);
        }

        if (externalTheft) {
            return JSON.parse(JSON.stringify({ success: true, bike: externalTheft }));
        }

        // 3. SI NO EXISTE EN NINGÚN LADO
        return { success: false, notFound: true, message: 'Esta bicicleta no está registrada ni cuenta con reportes internacionales activos.' };

    } catch (error) {
        console.error("Error validating bike:", error);
        return { success: false, error: 'Ocurrió un error al consultar la base de datos.' };
    }
}

export async function sendShopSightingAlertAction(bikeOwnerId: string, bikeMake: string, bikeModel: string) {
    const shopUser = await getAuthenticatedUser();
    if (!shopUser || shopUser.role !== 'ong') {
        return { success: false, error: 'No autorizado' };
    }

    try {
        // Obtener datos del dueño
        const ownerDoc = await db.collection('users').doc(bikeOwnerId).get();
        if (!ownerDoc.exists) return { success: false, error: 'Dueño original no encontrado.' };
        
        const owner = ownerDoc.data();
        if (!owner || !owner.email) return { success: false, error: 'El dueño no tiene email registrado.' };

        // Obtener datos de la ONG logueada
        const shopDoc = await db.collection('ong-profiles').doc(shopUser.id).get();
        const shopData = shopDoc.data() || {};
        
        const locationString = [shopData.city, shopData.state, shopData.country].filter(Boolean).join(', ');

        const emailData = {
            ownerName: owner.name || 'Ciclista',
            bikeMake,
            bikeModel,
            shopName: shopData.organizationName || shopUser.name || 'Una tienda',
            shopWhatsapp: shopData.contactWhatsapp,
            shopEmail: shopData.email || shopUser.email,
            shopLocation: locationString || 'Ubicación no especificada',
        };

        const result = await sendShopSightingAlertEmail(owner.email, emailData);

        if (result.success) {
            return { success: true, message: 'Alerta enviada exitosamente al propietario.' };
        } else {
            return { success: false, error: 'Fallo al enviar el correo a través del proveedor.' };
        }
    } catch (error) {
        console.error("Error in sendShopSightingAlertAction:", error);
        return { success: false, error: 'Error interno del servidor al procesar la alerta.' };
    }
}