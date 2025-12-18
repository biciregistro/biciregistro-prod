'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import {
    updateHomepageSectionData,
    updateUserData,
    createUser as createFirestoreUser,
    createOngFirestoreProfile,
    createEvent,
    updateEvent,
    getHomepageData,
    getEvent,
    cancelEventRegistration,
    updateEventRegistrationBike,
    updateRegistrationStatusInternal,
    cancelEventRegistrationById,
    getAuthenticatedUser,
} from './data';
import { updateFinancialSettings, updateOngFinancialData } from './financial-data';
import { deleteSession, getDecodedSession } from './auth';
import { ActionFormState, HomepageSection, Event, PaymentStatus, BikeFormState } from './types';
import { userFormSchema, ongUserFormSchema, eventFormSchema, financialSettingsSchema, financialProfileSchema } from './schemas';
import { adminAuth } from './firebase/server';

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

// --- WRAPPERS FOR BIKE ACTIONS ---
// Necessary to satisfy 'use server' re-export limitations

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

const alliesItemSchema = z.object({
    sponsors: z.array(z.object({
        name: z.string().optional(),
        url: z.string().url('URL inválida')
    })).optional()
});

// Helper to ensure dates are saved as ISO YYYY-MM-DD
const normalizeDateToISO = (dateStr: string | undefined): string | undefined => {
    if (!dateStr) return dateStr;
    // Check for DD/MM/YYYY
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
            error: 'Datos proporcionados no válidos. Asegúrate de que las contraseñas coincidan y cumplan los requisitos.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    if (!validatedFields.data.email) {
        return { error: 'El correo electrónico es inexplicablemente inválido a pesar de pasar la validación.' };
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
        
        // 1. Exclude password fields and temp notification fields
        const { password: p, confirmPassword: cp, notificationsSafety, notificationsMarketing, birthDate, ...userProfileData } = validatedFields.data;
        
        // 2. Construct notification preferences object
        const notificationPreferences = {
            safety: !!notificationsSafety,
            marketing: !!notificationsMarketing
        };

        // 3. Construct the raw data object for Firestore
        const rawUserData = {
            id: userRecord.uid,
            ...userProfileData,
            birthDate: normalizeDateToISO(birthDate),
            email: email, 
            role: 'ciclista' as const,
            communityId,
            notificationPreferences,
            createdAt: new Date().toISOString(), // <-- Add createdAt timestamp
        };

        // 4. Clean the object: Remove any keys with undefined values to prevent Firestore errors
        const cleanUserData = Object.fromEntries(
            Object.entries(rawUserData).filter(([_, value]) => value !== undefined)
        );

        // 5. Save the cleaned data
        await createFirestoreUser(cleanUserData as any);
        
        return { success: true, customToken: customToken };
        
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            return { error: 'Este correo electrónico ya está en uso.' };
        }
        console.error("Signup error:", error);
        return { error: 'Ocurrió un error inesperado durante la creación de la cuenta.' };
    }
}

export async function createOngUser(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const validatedFields = ongUserFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            error: 'Datos proporcionados no válidos. Por favor, revisa todos los campos.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { email, password, organizationName, ...ongData } = validatedFields.data;

    const generateUid = (name: string) => {
        return name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .slice(0, 50);
    };

    const uid = generateUid(organizationName);
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const invitationLink = `${baseUrl}/join/${uid}`;

    try {
        const userRecord = await adminAuth.createUser({
            uid,
            email,
            password,
            displayName: organizationName,
        });

        await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'ong' });

        // 1. Crear perfil extendido en 'ong-profiles'
        await createOngFirestoreProfile({
            id: userRecord.uid,
            organizationName,
            invitationLink, // Guardar el link generado
            ...ongData,
        });

        // 2. Crear documento de usuario básico en 'users' para mantener consistencia
        await createFirestoreUser({
            id: userRecord.uid,
            email: email,
            name: organizationName,
            role: 'ong',
            createdAt: new Date().toISOString(),
        });

    } catch (error: any) {
        if (error.code === 'auth/uid-already-exists') {
            return { error: `El nombre de la organización '${organizationName}' ya está en uso. Por favor, elige uno diferente.` };
        }
        if (error.code === 'auth/email-already-exists') {
            return { error: 'Este correo electrónico ya está en uso.' };
        }
        console.error("ONG creation error:", error);
        return { error: 'Ocurrió un error inesperado durante la creación de la cuenta.' };
    }
    
    revalidatePath('/admin');
    redirect('/admin?tab=ongs');
}

export async function updateHomepageSection(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const data = Object.fromEntries(formData.entries());
    const validatedFields = homepageEditSchema.safeParse(data);
    
    if (!validatedFields.success) {
        return { error: "Datos inválidos.", errors: validatedFields.error.flatten().fieldErrors };
    }

    try {
        const payload: Partial<HomepageSection> = { ...validatedFields.data };
        
        if (payload.id === 'allies') {
            let sponsors = [];
            if (data.sponsorsJson && typeof data.sponsorsJson === 'string') {
                try {
                    sponsors = JSON.parse(data.sponsorsJson);
                } catch (e) {
                    console.error("Error parsing sponsors JSON", e);
                    // No hacer nada, se usará un array vacío
                }
            }

            // Construir el payload completo para 'allies'
            const alliesPayload: Extract<HomepageSection, { id: 'allies' }> = {
                id: 'allies',
                title: payload.title || 'Nuestros Aliados', // Default title si no existe
                sponsors: sponsors
            };
            
            await updateHomepageSectionData(alliesPayload);
        } else if (payload.id === 'security') {
             let items = [];
             if (data.itemsJson && typeof data.itemsJson === 'string') {
                 try {
                     items = JSON.parse(data.itemsJson);
                 } catch (e) {
                     console.error("Error parsing security items JSON", e);
                 }
             }
             
             // Ensure we have exactly 3 items structure if possible, or trust admin
             const securityPayload: Extract<HomepageSection, { id: 'security' }> = {
                 id: 'security',
                 title: payload.title || 'Tu Seguridad es Nuestra Prioridad',
                 subtitle: payload.subtitle || '',
                 items: items as [any, any, any] // Type assertion for tuple
             };
             
             await updateHomepageSectionData(securityPayload);
        } else {
             // Lógica original para las otras secciones
            await updateHomepageSectionData(payload as HomepageSection);
        }

        revalidatePath('/');
        return { success: true, message: `Sección '${validatedFields.data.id}' actualizada.` };
    } catch (error) {
        console.error("Error updating homepage section:", error);
        return { error: "No se pudo actualizar la sección." };
    }
}

export async function updateFeatureItem(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const validatedFields = featureItemSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        return { error: "Datos de característica inválidos.", errors: validatedFields.error.flatten().fieldErrors };
    }

    const { featureId, ...featureData } = validatedFields.data;

    try {
        const homepageData = await getHomepageData();
        const featuresSection = homepageData.features as Extract<HomepageSection, { id: 'features' }>;

        if (!featuresSection || !featuresSection.features) {
            return { error: "La sección de características no existe." };
        }

        const featureIndex = featuresSection.features.findIndex((f: any) => f.id === featureId);
        if (featureIndex === -1) {
            return { error: "La característica no fue encontrada." };
        }

        featuresSection.features[featureIndex] = { ...featuresSection.features[featureIndex], ...featureData };
        
        const updatedFeaturesSection: HomepageSection = {
            ...featuresSection,
            id: 'features', 
        };

        await updateHomepageSectionData(updatedFeaturesSection);

        revalidatePath('/');
        return { success: true, message: "Característica actualizada correctamente." };
    } catch (error) {
        console.error("Error updating feature item:", error);
        return { error: "No se pudo actualizar la característica." };
    }
}

export async function updateProfile(prevState: any, formData: FormData): Promise<ActionFormState> {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { error: 'No estás autenticado.' };
    }

    const validatedFields = userFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            error: 'Datos proporcionados no válidos.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    // Extract temporary notification fields
    const { id, currentPassword, newPassword, email, notificationsSafety, notificationsMarketing, birthDate, ...userData } = validatedFields.data;

    if (id !== session.uid) {
        return { error: 'No tienes permiso para actualizar este perfil.' };
    }

    try {
        let passwordChanged = false;
        if (newPassword) {
            await adminAuth.updateUser(session.uid, { password: newPassword });
            await deleteSession();
            passwordChanged = true;
        }

        // Construct update payload with notification preferences
        const updatePayload = {
            ...userData,
            birthDate: normalizeDateToISO(birthDate),
            notificationPreferences: {
                safety: !!notificationsSafety,
                marketing: !!notificationsMarketing
            }
        };

        await updateUserData(session.uid, updatePayload);

        revalidatePath('/dashboard/profile');
        return { 
            success: true, 
            message: passwordChanged 
                ? 'Contraseña actualizada. Por favor, inicia sesión de nuevo.'
                : 'Perfil actualizado correctamente.',
            passwordChanged,
        };

    } catch (error: any) {
        console.error("Update profile error:", error);
        return { error: 'Hubo un error inesperado al actualizar tu perfil.' };
    }
}

export async function logout() {
    await deleteSession();
    // Use root path to avoid issues with protected routes returning 404/redirect loops
    // when session is invalidated during the action response
    revalidatePath('/', 'layout');
    redirect('/');
}

export async function forceLogout() {
    await deleteSession();
}

export async function saveEvent(eventData: any, isDraft: boolean): Promise<ActionFormState> {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { error: 'No estás autenticado.' };
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
        const eventId = eventData.id;

        const payload: Omit<Event, 'id'> = {
            ongId: session.uid,
            status: status,
            ...data,
            costTiers: data.costTiers || [],
        };

        if (eventId) {
            await updateEvent(eventId, payload);
            revalidatePath(`/dashboard/ong/events/${eventId}`);
            // If editing, we revalidate the specific path
            // For admins, we might want to revalidate admin paths too if we had a detail view
        } else {
            await createEvent(payload);
        }

        // Dynamic revalidation based on role
        if (session.admin === true) {
             revalidatePath('/admin');
        } else {
             revalidatePath('/dashboard/ong');
        }
        
        return { success: true, message: isDraft ? 'Borrador guardado exitosamente.' : 'Evento publicado exitosamente.' };

    } catch (error: any) {
        console.error("Save event error:", error);
        return { error: 'Ocurrió un error al guardar el evento.' };
    }
}

export async function toggleEventStatusAction(eventId: string, newStatus: 'draft' | 'published'): Promise<{ success: boolean; error?: string }> {
    const session = await getDecodedSession();
    
    if (!session?.uid || (session.role !== 'ong' && session.admin !== true)) {
        return { success: false, error: "No tienes permisos para realizar esta acción." };
    }

    try {
        const event = await getEvent(eventId);
        if (!event) {
            return { success: false, error: "El evento no existe." };
        }

        if (event.ongId !== session.uid) {
            return { success: false, error: "No tienes permiso para modificar este evento." };
        }

        await updateEvent(eventId, { status: newStatus });
        revalidatePath(`/dashboard/ong/events/${eventId}`);
        if (session.admin === true) {
             revalidatePath('/admin');
        }
        
        return { success: true };
    } catch (error) {
        console.error("Error toggling event status:", error);
        return { success: false, error: "Ocurrió un error al actualizar el estado del evento." };
    }
}

export async function cancelRegistrationAction(eventId: string): Promise<{ success: boolean; error?: string }> {
    const session = await getDecodedSession();
    
    if (!session?.uid) {
        return { success: false, error: "Debes iniciar sesión." };
    }

    const result = await cancelEventRegistration(eventId, session.uid);

    if (result.success) {
        revalidatePath(`/dashboard/events/${eventId}`);
        revalidatePath('/dashboard');
        revalidatePath(`/events/${eventId}`);
    }

    return result;
}

export async function selectEventBikeAction(eventId: string, bikeId: string): Promise<{ success: boolean; error?: string }> {
    const session = await getDecodedSession();
    
    if (!session?.uid) {
        return { success: false, error: "Debes iniciar sesión." };
    }

    const result = await updateEventRegistrationBike(eventId, session.uid, bikeId);

    if (result.success) {
        revalidatePath(`/dashboard/events/${eventId}`);
        revalidatePath(`/dashboard/ong/events/${eventId}`); 
    }

    return result;
}

export async function updateRegistrationPaymentStatus(registrationId: string, eventId: string, newStatus: PaymentStatus): Promise<{ success: boolean; error?: string }> {
    const session = await getDecodedSession();
    if (!session?.uid || (session.role !== 'ong' && session.admin !== true)) {
        return { success: false, error: "No tienes permiso para realizar esta acción." };
    }

    try {
        await updateRegistrationStatusInternal(registrationId, { paymentStatus: newStatus });
        revalidatePath(`/dashboard/ong/events/${eventId}`);
        return { success: true };
    } catch (error) {
        console.error("Error updating payment status:", error);
        return { success: false, error: "Error al actualizar el estado de pago." };
    }
}

export async function toggleCheckInStatus(registrationId: string, eventId: string, newStatus: boolean): Promise<{ success: boolean; error?: string }> {
    const session = await getDecodedSession();
    if (!session?.uid || (session.role !== 'ong' && session.admin !== true)) {
        return { success: false, error: "No tienes permiso para realizar esta acción." };
    }

    try {
        await updateRegistrationStatusInternal(registrationId, { checkedIn: newStatus });
        revalidatePath(`/dashboard/ong/events/${eventId}`);
        return { success: true };
    } catch (error) {
        console.error("Error toggling check-in status:", error);
        return { success: false, error: "Error al actualizar la asistencia." };
    }
}

export async function cancelRegistrationManuallyAction(registrationId: string, eventId: string): Promise<{ success: boolean; error?: string }> {
    const session = await getDecodedSession();
    if (!session?.uid || (session.role !== 'ong' && session.admin !== true)) {
        return { success: false, error: "No tienes permiso para realizar esta acción." };
    }

    try {
        const result = await cancelEventRegistrationById(eventId, registrationId);
        if (result.success) {
            revalidatePath(`/dashboard/ong/events/${eventId}`);
        }
        return result;
    } catch (error) {
        console.error("Error cancelling registration manually:", error);
        return { success: false, error: "Error al cancelar la inscripción." };
    }
}

export async function saveFinancialSettingsAction(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    // Validar usuario consultando la base de datos, no solo el token de sesión
    const user = await getAuthenticatedUser();
    
    if (!user || user.role !== 'admin') {
        return { error: 'No tienes permisos para realizar esta acción.' };
    }

    const validatedFields = financialSettingsSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            error: 'Datos inválidos. Verifica los campos.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    try {
        await updateFinancialSettings(validatedFields.data);
        revalidatePath('/admin');
        return { success: true, message: 'Configuración financiera actualizada correctamente.' };
    } catch (error) {
        console.error("Error saving financial settings:", error);
        return { error: 'Ocurrió un error al guardar la configuración.' };
    }
}

export async function saveOngFinancialsAction(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const session = await getDecodedSession();
    if (!session?.uid || session.role !== 'ong') {
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
        await updateOngFinancialData(session.uid, validatedFields.data);
        revalidatePath('/dashboard/ong/profile');
        return { success: true, message: 'Datos bancarios guardados correctamente.' };
    } catch (error) {
        console.error("Error saving ONG financials:", error);
        return { error: 'Ocurrió un error al guardar los datos bancarios.' };
    }
}
