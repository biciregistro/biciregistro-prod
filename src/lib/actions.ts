'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import {
    addBike,
    updateBikeData,
    updateHomepageSectionData,
    updateUserData,
    createUser as createFirestoreUser, // Renamed import
    verifyUserPassword,
    getHomepageData,
    getUserByEmail,
    getBike,
    isSerialNumberUnique, // Ensure isSerialNumberUnique is imported
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
    const validatedFields = userFormSchema.safeParse(Object.fromEntries(formData.entries()));

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

    try {
        const userRecord = await adminAuth.createUser({
            email,
            password: password!,
            displayName: `${name} ${lastName}`,
        });
        
        const customToken = await adminAuth.createCustomToken(userRecord.uid);
        
        await createFirestoreUser({
            id: userRecord.uid,
            ...validatedFields.data,
            email: email, 
            role: 'ciclista', 
        });
        
        return { success: true, customToken: customToken };
        
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            return { error: 'Este correo electrónico ya está en uso.' };
        }
        console.error("Signup error:", error);
        return { error: 'Ocurrió un error inesperado durante la creación de la cuenta.' };
    }
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
        if (newPassword && currentPassword) {
            if (!session.email) {
                 return { error: 'No se pudo verificar tu identidad. Tu sesión no tiene un correo electrónico asociado.' };
            }
            const isPasswordVerified = await verifyUserPassword(session.email, currentPassword);
            if (!isPasswordVerified) {
                return { 
                    error: 'La contraseña actual es incorrecta.',
                    errors: { currentPassword: ['La contraseña actual no es correcta.'] }
                };
            }
            await adminAuth.updateUser(session.uid, { password: newPassword });
        }

        await updateUserData(session.uid, userData);

        revalidatePath('/dashboard/profile');
        return { success: true, message: 'Perfil actualizado correctamente.' };

    } catch (error: any) {
        console.error("Update profile error:", error);
        if (error.code === 'auth/wrong-password') {
            return { 
                error: 'La contraseña actual es incorrecta.',
                errors: { currentPassword: ['La contraseña actual no es correcta.'] }
            };
        }
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
        // Align the error response with the client's expectation
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
            ownershipProof: ownershipProofUrl || '', // Restore the safe guard
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
            ownershipProof: ownershipProofUrl || '', // Restore the safe guard
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
        // Handle not authenticated
        return;
    }
    try {
        await updateBikeData(bikeId, {
            status: 'safe',
            theftReport: undefined, // Remove theft details
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
        const newOwner = await getUserByEmail(newOwnerEmail);
        if (!newOwner) {
            return { error: 'El usuario con ese correo electrónico no fue encontrado.' };
        }

        if (newOwner.id === currentUserId) {
            return { error: 'No puedes transferirte la bicicleta a ti mismo.' };
        }
        
        // Corrected call to getBike with both userId and bikeId
        const bike = await getBike(currentUserId, bikeId);
        if (!bike) { // getBike now returns null if the user is not the owner
            return { error: 'No estás autorizado para transferir esta bicicleta.' };
        }

        await updateBikeData(bikeId, { userId: newOwner.id });
        
        revalidatePath('/dashboard');
        revalidatePath(`/dashboard/bikes/${bikeId}`);
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
