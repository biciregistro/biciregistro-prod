'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

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
} from './data';
import { updateFinancialSettings } from './financial-data';
import { deleteSession, getDecodedSession } from './auth';
import { ActionFormState, HomepageSection, Event, PaymentStatus, BikeFormState } from './types';
import { userFormSchema, ongUserFormSchema, financialSettingsSchema } from './schemas';
import { adminAuth } from './firebase/server';
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

export async function selectEventBikeAction(eventId: string, bikeId: string) {
    const session = await getDecodedSession();
    if (!session?.uid) return { success: false, error: "Inicia sesión." };
    const result = await updateEventRegistrationBike(eventId, session.uid, bikeId);
    if (result.success) revalidatePath(`/dashboard/events/${eventId}`);
    return result;
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
