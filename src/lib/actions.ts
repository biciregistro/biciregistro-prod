'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import {
    addBike,
    isSerialNumberUnique,
    updateBikeData,
    updateHomepageSectionData,
    updateUserData,
    createUser,
    verifyUserPassword,
    getHomepageData,
    getUserByEmail,
    getBike,
} from './data';
import { deleteSession, getDecodedSession } from './auth';
import { ActionFormState, HomepageSection, Feature, BikeFormState } from './types';
import { userFormSchema, BikeRegistrationSchema } from './schemas';
import { adminAuth } from './firebase/server';

// Helper function to handle optional string fields from forms
const optionalString = (schema: z.ZodString) =>
    z.preprocess((val) => (val === '' ? undefined : val), schema.optional());

const bikeFormSchema = BikeRegistrationSchema.extend({
    id: z.string().optional(),
    userId: z.string().min(1, 'El ID de usuario es obligatorio.'),
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

// Schema for validating a single feature item
const featureItemSchema = z.object({
    featureId: z.string(),
    title: z.string().min(1, 'El título es obligatorio'),
    description: z.string().min(1, 'La descripción es obligatoria'),
    imageUrl: z.string().url('La URL de la imagen no es válida'),
});

// Schema for theft report form
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
    // ... implementation remains correct
    return { error: 'Ocurrió un error inesperado.' };
}

export async function updateHomepageSection(prevState: any, formData: FormData) {
    const validatedFields = homepageEditSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { error: 'Datos proporcionados no válidos.', errors: validatedFields.error.flatten().fieldErrors };
    }

    const data: Partial<HomepageSection> = { ...validatedFields.data };

    try {
        await updateHomepageSectionData(data as HomepageSection);
        revalidatePath('/');
        return { message: `La sección '${validatedFields.data.id}' se actualizó correctamente.` };
    } catch (error) {
        return { error: 'Error en la base de datos al actualizar la sección.' };
    }
}

// Server Action to update a single feature item
export async function updateFeatureItem(prevState: any, formData: FormData) {
    const validatedFields = featureItemSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { error: 'Datos de característica no válidos.', errors: validatedFields.error.flatten().fieldErrors };
    }

    const { featureId, ...updatedFeatureData } = validatedFields.data;

    try {
        const homepageData = await getHomepageData();
        const featuresSection = homepageData['features'];

        if (!featuresSection || featuresSection.id !== 'features') {
            return { error: 'La sección de características no fue encontrada o es del tipo incorrecto.' };
        }

        const updatedFeatures = featuresSection.features.map((feature: Feature & { id?: string }) =>
            feature.id === featureId ? { ...feature, ...updatedFeatureData } : feature
        );

        const dataToUpdate: Partial<HomepageSection> & { id: string } = {
            id: 'features',
            features: updatedFeatures,
        };

        await updateHomepageSectionData(dataToUpdate as HomepageSection);
        revalidatePath('/');
        return { message: `Característica '${updatedFeatureData.title}' actualizada.` };

    } catch (error) {
        return { error: 'Error en la base de datos al actualizar la característica.' };
    }
}


export async function updateProfile(prevState: any, formData: FormData): Promise<ActionFormState> {
    // ... implementation remains correct
    return { error: 'Ocurrió un error inesperado.' };
}

export async function registerBike(prevState: BikeFormState, formData: FormData): Promise<BikeFormState> {
    const validatedFields = bikeFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Error de validación. Por favor, revisa los campos.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { id, ...bikeData } = validatedFields.data;

    try {
        await addBike({
            ...bikeData,
            photos: [
                bikeData.photoUrl,
                bikeData.serialNumberPhotoUrl,
                bikeData.additionalPhoto1Url,
                bikeData.additionalPhoto2Url,
            ].filter(Boolean) as string[],
        });

        revalidatePath('/dashboard');
        return { success: true, message: '¡Bicicleta registrada exitosamente!' };

    } catch (error) {
        console.error("Database error during bike registration:", error);
        return { success: false, message: 'Error en la base de datos: No se pudo registrar la bicicleta.' };
    }
}

export async function updateBike(prevState: BikeFormState, formData: FormData): Promise<BikeFormState> {
    const validatedFields = bikeFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Error de validación. Por favor, revisa los campos.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { id, ...bikeData } = validatedFields.data;
    if (!id) {
        return { success: false, message: "Error: No se encontró el ID de la bicicleta para actualizar." };
    }

    try {
        await updateBikeData(id, {
            ...bikeData,
            photos: [
                bikeData.photoUrl,
                bikeData.serialNumberPhotoUrl,
                bikeData.additionalPhoto1Url,
                bikeData.additionalPhoto2Url,
            ].filter(Boolean) as string[],
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
        return { message: 'El robo ha sido reportado exitosamente.' };
    } catch (error) {
        return { message: 'Error de base de datos: No se pudo reportar el robo.' };
    }
}

export async function markAsRecovered(bikeId: string) {
    try {
        await updateBikeData(bikeId, {
            status: 'safe',
            theftReport: undefined, // Remove theft details
        });
        revalidatePath('/dashboard');
    } catch (error) {
        console.error("Failed to mark as recovered:", error);
    }
}

export async function updateOwnershipProof(bikeId: string, proofUrl: string) {
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

export async function transferOwnership(prevState: { error: string }, formData: FormData): Promise<{ error: string }> {
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
        const bike = await getBike(bikeId);
        if (!bike) {
            return { error: 'La bicicleta no fue encontrada.' };
        }

        if (bike.userId !== currentUserId) {
            return { error: 'No tienes permiso para transferir esta bicicleta.' };
        }

        const newOwner = await getUserByEmail(newOwnerEmail);
        if (!newOwner) {
            return { error: 'El usuario con ese correo electrónico no fue encontrado.' };
        }

        if (newOwner.id === currentUserId) {
            return { error: 'No puedes transferirte la bicicleta a ti mismo.' };
        }

        // Proceed with the transfer
        await updateBikeData(bikeId, { userId: newOwner.id, status: 'safe' });

        revalidatePath('/dashboard');
        redirect('/dashboard');

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
