'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import {
    addBike,
    updateBikeData,
    updateHomepageSectionData,
    updateUserData,
    createUser as createFirestoreUser,
    createOngFirestoreProfile,
    createEvent,
    updateEvent,
    getHomepageData,
    getUserByEmail,
    getBike,
    getEvent,
    isSerialNumberUnique,
    registerUserToEvent,
    cancelEventRegistration,
    updateEventRegistrationBike,
} from './data';
import { deleteSession, getDecodedSession } from './auth';
import { ActionFormState, HomepageSection, Feature, BikeFormState, Event } from './types';
import { userFormSchema, ongUserFormSchema, BikeRegistrationSchema, eventFormSchema } from './schemas';
import { adminAuth } from './firebase/server';

// ... (Rest of imports and schema definitions remain unchanged)
const optionalString = (schema: z.ZodString) =>
    z.preprocess((val) => (val === '' ? undefined : val), schema.optional());

const bikeFormSchema = BikeRegistrationSchema.extend({
    id: z.string().optional(),
    photoUrl: z.string().url("URL de foto lateral inválida.").min(1, "La foto lateral es obligatoria."),
    serialNumberPhotoUrl: z.string().url("URL de foto de serie inválida.").min(1, "La foto del número de serie es obligatoria."),
    additionalPhoto1Url: optionalString(z.string().url({ message: "URL de foto adicional 1 inválida." })),
    additionalPhoto2Url: optionalString(z.string().url({ message: "URL de foto adicional 2 inválida." })),
    ownershipProofUrl: optionalString(z.string().url({ message: "URL de prueba de propiedad inválida." })),
});

const homepageEditSchema = z.object({
    id: z.enum(['hero', 'features', 'cta']),
    title: z.string().min(1, 'El título es obligatorio'),
    subtitle: z.string().min(1, 'El subtítulo es obligatorio'),
    imageUrl: z.string().url('La URL de la imagen no es válida').optional(),
    buttonText: z.string().optional(),
});

const featureItemSchema = z.object({
    featureId: z.string(),
    title: z.string().min(1, 'El título es obligatorio'),
    description: z.string().min(1, 'La descripción es obligatoria'),
    imageUrl: z.string().url('La URL de la imagen no es válida'),
});

const theftReportSchema = z.object({
    bikeId: z.string(),
    date: z.string().min(1, "La fecha es obligatoria."),
    time: z.string().optional(),
    country: z.string().min(1, "El país es obligatorio."),
    state: z.string().min(1, "El estado/provincia es obligatorio."),
    location: z.string().min(1, "La ubicación es obligatoria."),
    details: z.string().min(1, "Los detalles son obligatorios."),
});


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
        
        // 1. Exclude password fields (security/schema hygiene)
        const { password: p, confirmPassword: cp, ...userProfileData } = validatedFields.data;
        
        // 2. Construct the raw data object for Firestore
        const rawUserData = {
            id: userRecord.uid,
            ...userProfileData,
            email: email, 
            role: 'ciclista' as const,
            communityId,
        };

        // 3. Clean the object: Remove any keys with undefined values to prevent Firestore errors
        // This is critical because 'communityId' is undefined for standard signups.
        const cleanUserData = Object.fromEntries(
            Object.entries(rawUserData).filter(([_, value]) => value !== undefined)
        );

        // 4. Save the cleaned data
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

        await createOngFirestoreProfile({
            id: userRecord.uid,
            organizationName,
            invitationLink, // Guardar el link generado
            ...ongData,
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
    const validatedFields = homepageEditSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        return { error: "Datos inválidos.", errors: validatedFields.error.flatten().fieldErrors };
    }
    try {
        await updateHomepageSectionData(validatedFields.data as HomepageSection);
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

    const { id, currentPassword, newPassword, email, ...userData } = validatedFields.data;

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

        await updateUserData(session.uid, userData);

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

export async function registerBike(prevState: BikeFormState, formData: FormData): Promise<BikeFormState> {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { success: false, message: 'No estás autenticado.' };
    }

    const validatedFields = bikeFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Error de validación. Por favor, revisa los campos.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { photoUrl, serialNumberPhotoUrl, additionalPhoto1Url, additionalPhoto2Url, ownershipProofUrl, serialNumber, ...bikeData } = validatedFields.data;
    
    const isUnique = await isSerialNumberUnique(serialNumber);
    if (!isUnique) {
        return {
            success: false,
            message: `Error: El número de serie '${serialNumber}' ya se encuentra registrado.`,
            errors: { serialNumber: ["Este número de serie ya está registrado."] },
        };
    }

    try {
        await addBike({
            ...bikeData,
            userId: session.uid,
            serialNumber,
            ownershipProof: ownershipProofUrl || '',
            photos: [
                photoUrl,
                serialNumberPhotoUrl,
                additionalPhoto1Url,
                additionalPhoto2Url,
            ].filter((url): url is string => !!url),
        });

        revalidatePath('/dashboard');
        return { success: true, message: '¡Bicicleta registrada exitosamente!' };

    } catch (error) {
        console.error("Database error during bike registration:", error);
        return { success: false, message: 'Error en la base de datos: No se pudo registrar la bicicleta.' };
    }
}


export async function updateBike(prevState: BikeFormState, formData: FormData): Promise<BikeFormState> {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { success: false, message: 'No estás autenticado.' };
    }

    const validatedFields = bikeFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Error de validación. Por favor, revisa los campos.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { id, photoUrl, serialNumberPhotoUrl, additionalPhoto1Url, additionalPhoto2Url, ownershipProofUrl, serialNumber, ...bikeData } = validatedFields.data;
    if (!id) {
        return { success: false, message: "Error: No se encontró el ID de la bicicleta para actualizar." };
    }
    
    const isUnique = await isSerialNumberUnique(serialNumber, id);
    if (!isUnique) {
        return {
            success: false,
            message: `Error: El número de serie '${serialNumber}' ya se encuentra registrado.`,
            errors: { serialNumber: ["Este número de serie ya está registrado."] },
        };
    }

    try {
        await updateBikeData(id, {
            ...bikeData,
            serialNumber,
            ownershipProof: ownershipProofUrl || '',
            photos: [
                photoUrl,
                serialNumberPhotoUrl,
                additionalPhoto1Url,
                additionalPhoto2Url,
            ].filter((url): url is string => !!url),
        });
        revalidatePath('/dashboard');
        revalidatePath(`/dashboard/bikes/${id}`);
        return { success: true, message: 'Bicicleta actualizada correctamente.' };
    } catch (error) {
        console.error("Database error during bike update:", error);
        return { success: false, message: 'Error en la base de datos: No se pudo actualizar la bicicleta.' };
    }
}


export async function reportTheft(prevState: any, formData: FormData) {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { message: 'No estás autenticado.' };
    }

    const validatedFields = theftReportSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { errors: validatedFields.error.flatten().fieldErrors, message: 'Faltan campos. No se pudo reportar el robo.' };
    }

    const { bikeId, ...theftData } = validatedFields.data;

    try {
        await updateBikeData(bikeId, {
            status: 'stolen',
            theftReport: theftData,
        });
        revalidatePath('/dashboard');
        revalidatePath(`/dashboard/bikes/${bikeId}`);
        return { message: 'El robo ha sido reportado exitosamente.' };
    } catch (error) {
        return { message: 'Error de base de datos: No se pudo reportar el robo.' };
    }
}

export async function markAsRecovered(bikeId: string) {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return;
    }
    try {
        await updateBikeData(bikeId, {
            status: 'safe',
            theftReport: undefined,
        });
        revalidatePath('/dashboard');
        revalidatePath(`/dashboard/bikes/${bikeId}`);
    } catch (error) {
        console.error("Failed to mark as recovered:", error);
    }
}

export async function updateOwnershipProof(bikeId: string, proofUrl: string) {
    const session = await getDecodedSession();
    if (!session?.uid) {
        throw new Error("User not authenticated.");
    }
    try {
        await updateBikeData(bikeId, {
            ownershipProof: proofUrl,
        });
        revalidatePath(`/dashboard/bikes/${bikeId}`);
    } catch (error) {
        console.error("Failed to update ownership proof:", error);
        throw new Error("Could not update ownership proof.");
    }
}

export async function transferOwnership(prevState: { error?: string; success?: boolean }, formData: FormData): Promise<{ error?: string; success?: boolean }> {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { error: 'Debes iniciar sesión para transferir la propiedad.' };
    }

    const schema = z.object({
        bikeId: z.string(),
        newOwnerEmail: z.string().email('Por favor, introduce un correo electrónico válido.'),
    });

    const validatedFields = schema.safeParse({
        bikeId: formData.get('bikeId'),
        newOwnerEmail: formData.get('newOwnerEmail'),
    });

    if (!validatedFields.success) {
        return { error: 'Datos inválidos. Por favor, revisa el correo electrónico.' };
    }

    const { bikeId, newOwnerEmail } = validatedFields.data;
    const currentUserId = session.uid;

    try {
        const newOwner = await getUserByEmail(newOwnerEmail);
        if (!newOwner) {
            return { error: 'El usuario con ese correo electrónico no fue encontrado.' };
        }

        if (newOwner.id === currentUserId) {
            return { error: 'No puedes transferirte la bicicleta a ti mismo.' };
        }
        
        const bike = await getBike(currentUserId, bikeId);
        if (!bike) {
            return { error: 'No estás autorizado para transferir esta bicicleta.' };
        }

        await updateBikeData(bikeId, { userId: newOwner.id });
        
        revalidatePath('/dashboard');
        
        return { success: true };

    } catch (error) {
        console.error('Error al transferir la propiedad:', error);
        return { error: 'Ocurrió un error en el servidor. Por favor, inténtalo de nuevo.' };
    }
}

export async function logout() {
    await deleteSession();
    redirect('/login');
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
        if (session.role === 'admin') {
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

export async function registerForEventAction(
    eventId: string, 
    tierId?: string, 
    categoryId?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
    const session = await getDecodedSession();
    
    if (!session?.uid) {
        return { success: false, error: "Debes iniciar sesión para registrarte." };
    }

    const result = await registerUserToEvent({
        eventId,
        userId: session.uid,
        tierId,
        categoryId,
    });

    if (result.success) {
        revalidatePath(`/events/${eventId}`);
    }

    return result;
}

export async function toggleEventStatusAction(eventId: string, newStatus: 'draft' | 'published'): Promise<{ success: boolean; error?: string }> {
    const session = await getDecodedSession();
    
    if (!session?.uid || (session.role !== 'ong' && session.role !== 'admin')) {
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
        if (session.role === 'admin') {
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
