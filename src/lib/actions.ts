'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { Timestamp } from 'firebase-admin/firestore';

import {
    updateHomepageSectionData,
    updateUserData,
    createUser as createFirestoreUser,
    createOngFirestoreProfile,
    getHomepageData,
    getEvent,
    updateEvent,
    cancelEventRegistration,
    updateEventRegistrationBike,
    updateRegistrationStatusInternal,
    cancelEventRegistrationById,
    getAuthenticatedUser,
    createEventRegistration, // Se asume que esta función se creará en data.ts
} from './data';
import { updateFinancialSettings } from './financial-data';
import { deleteSession, getDecodedSession } from './auth';
import { ActionFormState, HomepageSection, Event, PaymentStatus, BikeFormState, Dependent, EventRegistration } from './types';
import { 
    userFormSchema, 
    ongUserFormSchema, 
    financialSettingsSchema,
    dependentFormSchema,
} from './schemas';
import { adminAuth, adminDb } from './firebase/server';
import { sendWelcomeEmail } from './email/resend-service';
import { processReferral } from './actions/referral-actions';
import { REFERRAL_COOKIE_NAME } from './gamification/constants';
import { recordUniqueAction, awardPoints } from './actions/gamification-actions'; 

// Import implementations from bike-actions
import { 
    registerBike as registerBikeImpl, 
    updateBike as updateBikeImpl, 
    reportTheft as reportTheftImpl, 
    markAsRecovered as markAsRecoveredImpl, 
    updateOwnershipProof as updateOwnershipProofImpl, 
    transferOwnership as transferOwnershipImpl,
    registerBikeWizardAction as registerBikeWizardActionImpl,
    validateSerialNumberAction as validateSerialNumberActionImpl
} from './actions/bike-actions';

// IMPORT NEW UTILS
import { normalizeBrand } from './utils';

// --- WRAPPERS FOR BIKE ACTIONS ---

export async function registerBike(prevState: BikeFormState, formData: FormData) {
    return registerBikeImpl(prevState, formData);
}

export async function updateBike(prevState: BikeFormState, formData: FormData) {
    return updateBikeImpl(prevState, formData);
}

export async function reportTheft(prevState: any, formData: FormData) {
    return reportTheftImpl(prevState, formData);
}

export async function markAsRecovered(bikeId: string) {
    return markAsRecoveredImpl(bikeId);
}

export async function updateOwnershipProof(bikeId: string, proofUrl: string) {
    return updateOwnershipProofImpl(bikeId, proofUrl);
}

export async function transferOwnership(prevState: { error?: string; success?: boolean }, formData: FormData) {
    return transferOwnershipImpl(prevState, formData);
}

export async function registerBikeWizardAction(formData: any) {
    return registerBikeWizardActionImpl(formData);
}

export async function validateSerialNumberAction(serialNumber: string) {
    return validateSerialNumberActionImpl(serialNumber);
}

// --- END WRAPPERS ---

const homepageEditSchema = z.object({
    id: z.enum(['hero', 'features', 'cta', 'allies', 'security']),
    title: z.string().min(1, 'El título es obligatorio'),
    subtitle: z.string().optional(),
    imageUrl: z.string().url('La URL de la imagen no es válida').optional(),
    buttonText: z.string().optional(),
});

const featureItemSchema = z.object({
    featureId: z.string(),
    title: z.string().min(1, 'El título es obligatorio'),
    description: z.string().min(1, 'La descripción es obligatoria'),
    imageUrl: z.string().url('La URL de la imagen no es válida'),
});

const normalizeDateToISO = (dateStr: string | undefined): string | undefined => {
    if (!dateStr) return dateStr;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        const [d, m, y] = dateStr.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return dateStr;
};

export async function signup(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const data = Object.fromEntries(formData.entries());
    const validatedFields = userFormSchema.safeParse(data);

    if (!validatedFields.success) {
        return {
            error: 'Datos proporcionados no válidos.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    if (!validatedFields.data.email) {
        return { error: 'Correo inválido.' };
    }

    const { email, password, name, lastName } = validatedFields.data;
    const communityId = data.communityId as string | undefined;

    try {
        const userRecord = await adminAuth.createUser({
            email,
            password: password!,
            displayName: `${name} ${lastName}`,
        });
        
        const customToken = await adminAuth.createCustomToken(userRecord.uid);
        
        const { password: p, confirmPassword: cp, notificationsSafety, notificationsMarketing, birthDate, ...userProfileData } = validatedFields.data;
        
        const notificationPreferences = {
            safety: !!notificationsSafety,
            marketing: !!notificationsMarketing
        };

        const rawUserData = {
            id: userRecord.uid,
            ...userProfileData,
            birthDate: normalizeDateToISO(birthDate),
            email: email, 
            role: 'ciclista' as const,
            communityId,
            notificationPreferences,
            createdAt: new Date().toISOString(),
        };

        await createFirestoreUser(rawUserData as any);

        // GAMIFICACIÓN DINÁMICA: Puntos de bienvenida
        let pointsAwarded = 0;
        try {
            const pointsResult = await awardPoints(userRecord.uid, 'user_signup');
            pointsAwarded = pointsResult?.points || 0;
        } catch (e) {
            console.error("Error awarding signup points", e);
        }

        // --- REFERRAL SYSTEM INTEGRATION ---
        try {
            const cookieStore = await cookies();
            const referralCode = cookieStore.get(REFERRAL_COOKIE_NAME)?.value;
            if (referralCode) {
                await processReferral(referralCode, userRecord.uid);
            }
        } catch (refError) {
            console.error("[Signup] Referral error:", refError);
        }

        sendWelcomeEmail({ name: name, email: email }).catch(console.error);
        
        // Corregido: Retornar el número de puntos real
        return { success: true, customToken, pointsAwarded };
        
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') return { error: 'Email en uso.' };
        return { error: 'Error inesperado.' };
    }
}

export async function createOngUser(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const validatedFields = ongUserFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { error: 'Datos no válidos.', errors: validatedFields.error.flatten().fieldErrors };
    }

    const { email, password, organizationName, ...ongData } = validatedFields.data;
    const generateUid = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
    const uid = generateUid(organizationName);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const invitationLink = `${baseUrl}/join/${uid}`;

    try {
        const userRecord = await adminAuth.createUser({ uid, email, password, displayName: organizationName });
        await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'ong' });
        await createOngFirestoreProfile({ id: userRecord.uid, organizationName, invitationLink, ...ongData });
        await createFirestoreUser({ id: userRecord.uid, email, name: organizationName, role: 'ong', createdAt: new Date().toISOString() });
        sendWelcomeEmail({ name: organizationName, email }).catch(console.error);
    } catch (error: any) {
        return { error: 'Error al crear cuenta ONG.' };
    }
    
    revalidatePath('/admin');
    redirect('/admin?tab=ongs');
}

export async function updateProfile(prevState: any, formData: FormData): Promise<ActionFormState> {
    const session = await getDecodedSession();
    if (!session?.uid) return { error: 'No autenticado.' };

    const validatedFields = userFormSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) return { error: 'Datos inválidos.', errors: validatedFields.error.flatten().fieldErrors };

    const { id, currentPassword, newPassword, email, notificationsSafety, notificationsMarketing, birthDate, ...userData } = validatedFields.data;
    if (id !== session.uid) return { error: 'No autorizado.' };

    try {
        let passwordChanged = false;
        if (newPassword) {
            await adminAuth.updateUser(session.uid, { password: newPassword });
            await deleteSession();
            passwordChanged = true;
        }

        const updatePayload = {
            ...userData,
            birthDate: normalizeDateToISO(birthDate),
            notificationPreferences: { safety: !!notificationsSafety, marketing: !!notificationsMarketing }
        };

        await updateUserData(session.uid, updatePayload);

        // GAMIFICACIÓN DINÁMICA: Completar perfil
        let pointsAwarded = 0;
        if (updatePayload.emergencyContactName && updatePayload.emergencyContactPhone && updatePayload.bloodType && updatePayload.state && updatePayload.city) {
            const result = await recordUniqueAction(session.uid, 'profile_completion');
            if (result && result.success && 'points' in result) {
                pointsAwarded = (result as any).points;
            }
        }

        revalidatePath('/dashboard/profile');
        return { 
            success: true, 
            message: passwordChanged ? 'Contraseña actualizada.' : 'Perfil actualizado.',
            passwordChanged,
            pointsAwarded 
        };

    } catch (error: any) {
        return { error: 'Error al actualizar perfil.' };
    }
}

export async function updateHomepageSection(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const data = Object.fromEntries(formData.entries());
    const validatedFields = homepageEditSchema.safeParse(data);
    if (!validatedFields.success) return { error: "Datos inválidos.", errors: validatedFields.error.flatten().fieldErrors };

    try {
        const payload: Partial<HomepageSection> = { ...validatedFields.data };
        if (payload.id === 'allies') {
            let sponsors = [];
            if (data.sponsorsJson) sponsors = JSON.parse(data.sponsorsJson as string);
            await updateHomepageSectionData({ id: 'allies', title: payload.title || '', sponsors });
        } else if (payload.id === 'security') {
             let items = [];
             if (data.itemsJson) items = JSON.parse(data.itemsJson as string);
             await updateHomepageSectionData({ id: 'security', title: payload.title || '', subtitle: payload.subtitle || '', items: items as any });
        } else {
            await updateHomepageSectionData(payload as HomepageSection);
        }
        revalidatePath('/');
        return { success: true, message: `Sección actualizada.` };
    } catch (error) {
        return { error: "No se pudo actualizar." };
    }
}

export async function updateFeatureItem(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const validatedFields = featureItemSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) return { error: "Datos inválidos." };
    const { featureId, ...featureData } = validatedFields.data;

    try {
        const homepageData = await getHomepageData();
        const featuresSection = homepageData.features as any;
        const featureIndex = featuresSection.features.findIndex((f: any) => f.id === featureId);
        if (featureIndex === -1) return { error: "No encontrado." };
        featuresSection.features[featureIndex] = { ...featuresSection.features[featureIndex], ...featureData };
        await updateHomepageSectionData(featuresSection);
        revalidatePath('/');
        return { success: true, message: "Actualizado." };
    } catch (error) {
        return { error: "Error." };
    }
}

export async function logout() { await deleteSession(); revalidatePath('/', 'layout'); redirect('/'); }
export async function forceLogout() { await deleteSession(); }

export async function toggleEventStatusAction(eventId: string, newStatus: 'draft' | 'published'): Promise<{ success: boolean; error?: string }> {
    const session = await getDecodedSession();
    if (!session?.uid || (session.role !== 'ong' && session.admin !== true)) return { success: false, error: "No autorizado." };
    try {
        const event = await getEvent(eventId);
        if (!event || event.ongId !== session.uid) return { success: false, error: "No permitido." };
        await updateEvent(eventId, { status: newStatus });
        revalidatePath(`/dashboard/ong/events/${eventId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error." };
    }
}

export async function cancelRegistrationAction(eventId: string) {
    const session = await getDecodedSession();
    if (!session?.uid) return { success: false, error: "Inicia sesión." };
    const result = await cancelEventRegistration(eventId, session.uid);
    if (result.success) { revalidatePath(`/dashboard/events/${eventId}`); revalidatePath('/dashboard'); }
    return result;
}

export async function selectEventBikeAction(registrationId: string, bikeId: string) {
    const session = await getDecodedSession();
    if (!session?.uid) return { success: false, error: "Inicia sesión." };
    const result = await updateEventRegistrationBike(registrationId, session.uid, bikeId);
    if (result.success && result.eventId) {
        revalidatePath(`/dashboard/events/${result.eventId}`);
        revalidatePath('/dashboard');
    }
    return { success: result.success, error: result.error };
}

export async function updateRegistrationPaymentStatus(registrationId: string, eventId: string, newStatus: PaymentStatus) {
    const session = await getDecodedSession();
    if (!session?.uid || (session.role !== 'ong' && session.admin !== true)) return { success: false };
    try {
        await updateRegistrationStatusInternal(registrationId, { paymentStatus: newStatus });
        revalidatePath(`/dashboard/ong/events/${eventId}`);
        return { success: true };
    } catch (error) { return { success: false }; }
}

export async function toggleCheckInStatus(registrationId: string, eventId: string, newStatus: boolean) {
    const session = await getDecodedSession();
    if (!session?.uid || (session.role !== 'ong' && session.admin !== true)) return { success: false };
    try {
        await updateRegistrationStatusInternal(registrationId, { checkedIn: newStatus });
        revalidatePath(`/dashboard/ong/events/${eventId}`);
        return { success: true };
    } catch (error) { return { success: false }; }
}

export async function cancelRegistrationManuallyAction(registrationId: string, eventId: string) {
    const session = await getDecodedSession();
    if (!session?.uid || (session.role !== 'ong' && session.admin !== true)) return { success: false };
    try {
        const result = await cancelEventRegistrationById(eventId, registrationId);
        if (result.success) revalidatePath(`/dashboard/ong/events/${eventId}`);
        return result;
    } catch (error) { return { success: false }; }
}

export async function saveFinancialSettingsAction(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'admin') return { error: 'No autorizado.' };
    const validatedFields = financialSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) return { error: 'Datos inválidos.' };
    try {
        await updateFinancialSettings(validatedFields.data);
        revalidatePath('/admin');
        return { success: true, message: 'Guardado.' };
    } catch (error) { return { error: 'Error.' }; }
}

// --- AUTOCOMPLETADO DEL LIBRO AZUL ---
export async function getModelsByBrandAction(brand: string): Promise<string[]> {
    if (!brand) return [];
    
    try {
        const { adminDb } = await import('@/lib/firebase/server');
        
        // 1. Usar el normalizador oficial para la marca completa
        const normBrand = normalizeBrand(brand);
        
        let snapshot = await adminDb.collection('blue-book-valuations')
            .where('brandId', '==', normBrand)
            .get();
            
        // 2. FALLBACK: Si no hay resultados y la marca tiene múltiples palabras (ej. "Honey Whale", "Pivot Cycles")
        // el script de ingesta antiguo guardaba solo la primera palabra. Intentamos buscar con ella.
        if (snapshot.empty && brand.trim().includes(' ')) {
            const firstWord = brand.trim().split(' ')[0];
            const fallbackNormBrand = normalizeBrand(firstWord);
            
            snapshot = await adminDb.collection('blue-book-valuations')
                .where('brandId', '==', fallbackNormBrand)
                .get();
        }

        if (snapshot.empty) return [];
        
        // Usamos un Map para deduplicar semánticamente basados en el modelId
        const modelMap = new Map<string, string>(); // modelId -> displayModel
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.modelId && data.displayModel) {
                const currentDisplay = modelMap.get(data.modelId);
                // Si no existe, o si el nuevo displayModel es más largo/descriptivo que el guardado, lo reemplazamos
                if (!currentDisplay || data.displayModel.length > currentDisplay.length) {
                    modelMap.set(data.modelId, data.displayModel);
                }
            } else if (data.displayModel && !data.modelId) {
                // Fallback de retrocompatibilidad si hay documentos viejos sin modelId explícito
                modelMap.set(data.displayModel.toLowerCase(), data.displayModel);
            }
        });
        
        // Retornamos solo los nombres limpios deduplicados
        return Array.from(modelMap.values()).sort();
    } catch (error) {
        console.error("Error fetching models for autocomplete:", error);
        return [];
    }
}

export async function swapBikeAssignmentsAction(
    registrationId1: string, 
    registrationId2: string,
    eventId: string
): Promise<{ success: boolean; error?: string; }> {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { success: false, error: "No autenticado." };
    }

    // NOTE: The collection name 'event-registrations' is inferred from other actions.
    const reg1Ref = adminDb.collection('event-registrations').doc(registrationId1);
    const reg2Ref = adminDb.collection('event-registrations').doc(registrationId2);

    try {
        await adminDb.runTransaction(async (transaction) => {
            const reg1Doc = await transaction.get(reg1Ref);
            const reg2Doc = await transaction.get(reg2Ref);

            if (!reg1Doc.exists || !reg2Doc.exists) {
                throw new Error("Una o ambas inscripciones no existen.");
            }
            
            const reg1Data = reg1Doc.data()!;
            const reg2Data = reg2Doc.data()!;

            // Security check: Ensure the authenticated user is the tutor/owner for both registrations.
            if (reg1Data.userId !== session.uid || reg2Data.userId !== session.uid) {
                throw new Error("No tienes permiso para modificar estas inscripciones.");
            }
            
            const bikeId1 = reg1Data.bikeId;
            const bikeId2 = reg2Data.bikeId;

            // Atomically swap the bike IDs
            transaction.update(reg1Ref, { bikeId: bikeId2 });
            transaction.update(reg2Ref, { bikeId: bikeId1 });
        });

        // Revalidate the path to reflect changes on the frontend
        revalidatePath(`/dashboard/events/${eventId}`);
        revalidatePath('/dashboard');

        return { success: true };

    } catch (error: any) {
        console.error("Error swapping bike assignments:", error);
        return { success: false, error: error.message || "Ocurrió un error inesperado durante el intercambio." };
    }
}


// --- ACCIONES PARA INSCRIPCIÓN DE MENORES ---

export async function createOrUpdateDependentAction(prevState: any, formData: FormData): Promise<ActionFormState & { dependent?: Dependent }> {
    const session = await getDecodedSession();
    if (!session?.uid) return { error: 'No autenticado.' };

    const validatedFields = dependentFormSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        return { error: 'Datos de menor inválidos.', errors: validatedFields.error.flatten().fieldErrors };
    }
    
    // The form sends dateOfBirth as 'DD/MM/YYYY', convert to a valid Date object for Firestore
    const { dateOfBirth, ...restOfData } = validatedFields.data;
    const [day, month, year] = dateOfBirth.split('/');
    const dobDate = new Date(`${year}-${month}-${day}`);
    
    if (isNaN(dobDate.getTime())) {
        return { error: 'La fecha de nacimiento no es válida.' };
    }

    const dependentData = { ...restOfData, dateOfBirth: dobDate };
    const existingDependentId = formData.get('dependentId') as string | undefined;

    try {
        const dependentPayload: Omit<Dependent, 'id' | 'dateOfBirth'> & { dateOfBirth: Timestamp } = {
            tutorId: session.uid,
            ...dependentData,
            dateOfBirth: Timestamp.fromDate(dependentData.dateOfBirth),
        };

        if (existingDependentId) {
            // Update
            await adminDb.collection('dependents').doc(existingDependentId).set(dependentPayload, { merge: true });
            const updatedDependent: Dependent = { id: existingDependentId, ...dependentPayload, dateOfBirth: dependentPayload.dateOfBirth.toDate() };
            return { success: true, message: 'Dependiente actualizado.', dependent: updatedDependent };
        } else {
            // Create
            const newDocRef = await adminDb.collection('dependents').add(dependentPayload);
            const newDependent: Dependent = { id: newDocRef.id, ...dependentPayload, dateOfBirth: dependentPayload.dateOfBirth.toDate() };
            return { success: true, message: 'Dependiente registrado.', dependent: newDependent };
        }
    } catch (error) {
        console.error("Error creating/updating dependent:", error);
        return { error: 'Error en el servidor al guardar los datos del menor.' };
    }
}

const registrationPayloadSchema = z.object({
    eventId: z.string(),
    tierId: z.string(),
    categoryId: z.string().optional(),
    jerseyModel: z.string().optional(),
    jerseySize: z.string().optional(),
    waiverSignature: z.string().min(1, "La firma es obligatoria."),
    waiverIp: z.string().optional(),
    customAnswers: z.string().optional(),
    dependentId: z.string().optional(),
    // Campos de emergencia del tutor (pueden ser nuevos si el tutor es nuevo)
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    bloodType: z.string().optional(),
    insuranceInfo: z.string().optional(),
    allergies: z.string().optional(),
});


export async function createEventRegistrationAction(prevState: any, formData: FormData): Promise<ActionFormState & { registrationId?: string }> {
    const session = await getDecodedSession();
    if (!session?.uid) return { error: 'No autenticado.' };
    
    const tutor = await getAuthenticatedUser();
    if (!tutor) return { error: 'No se encontró el perfil del usuario.' };

    const validatedFields = registrationPayloadSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        return { error: 'Datos de inscripción inválidos.', errors: validatedFields.error.flatten().fieldErrors };
    }

    const { eventId, dependentId, waiverSignature, waiverIp, ...payload } = validatedFields.data;

    try {
        const event = await getEvent(eventId);
        if (!event) return { error: 'El evento no existe.' };

        // Lógica de herencia de datos
        const registrationData: Partial<EventRegistration> = {
            eventId,
            userId: tutor.id,
            dependentId: dependentId,
            registrationDate: new Date().toISOString(),
            status: 'confirmed',
            paymentStatus: event.costType === 'Gratuito' ? 'not_applicable' : 'pending',
            tierId: payload.tierId,
            categoryId: payload.categoryId,
            jerseyModel: payload.jerseyModel,
            jerseySize: payload.jerseySize,
            waiverSignature,
            waiverIp: waiverIp || 'N/A',
            waiverAcceptedAt: new Date().toISOString(),
            waiverTextSnapshot: event.waiverText || '',
            customAnswers: payload.customAnswers ? JSON.parse(payload.customAnswers) : {},
        };

        if (dependentId) {
            // Es un menor, heredar datos de emergencia del tutor
            registrationData.emergencyContactName = tutor.emergencyContactName;
            registrationData.emergencyContactPhone = tutor.emergencyContactPhone;
            registrationData.bloodType = tutor.bloodType;
            registrationData.insuranceInfo = tutor.insuranceInfo;
            registrationData.allergies = tutor.allergies;
        } else {
            // Es el adulto, usar datos del formulario (que pueden ser para actualizar su perfil)
            registrationData.emergencyContactName = payload.emergencyContactName;
            registrationData.emergencyContactPhone = payload.emergencyContactPhone;
            registrationData.bloodType = payload.bloodType;
            registrationData.insuranceInfo = payload.insuranceInfo;
            registrationData.allergies = payload.allergies;
            
            // Si el adulto es nuevo o está completando su perfil, actualizamos sus datos
            const profileUpdate: any = {};
            if(payload.emergencyContactName && !tutor.emergencyContactName) profileUpdate.emergencyContactName = payload.emergencyContactName;
            if(payload.emergencyContactPhone && !tutor.emergencyContactPhone) profileUpdate.emergencyContactPhone = payload.emergencyContactPhone;
            if(payload.bloodType && !tutor.bloodType) profileUpdate.bloodType = payload.bloodType;
            if(Object.keys(profileUpdate).length > 0) {
                await updateUserData(tutor.id, profileUpdate);
            }
        }
        
        // Aquí se llamaría a la función que crea el documento en Firestore
        const registrationId = await createEventRegistration(registrationData as EventRegistration);

        // Revalidar rutas para que los cambios se reflejen
        revalidatePath(`/dashboard/ong/events/${eventId}`);
        revalidatePath('/dashboard');
        
        // Redireccionar al boleto
        redirect(`/dashboard/events/${registrationId}`);

    } catch (error) {
        console.error("Error creating event registration:", error);
        return { error: 'Error en el servidor al crear la inscripción.' };
    }
}
