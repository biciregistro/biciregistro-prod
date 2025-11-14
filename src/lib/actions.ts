'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { addBike, isSerialNumberUnique, updateBikeData, updateBikeStatus, updateHomepageSectionData, updateUserData, createUser, verifyUserPassword, getUserByEmail, getBike } from './data';
import { deleteSession, getDecodedSession } from './auth';
import { ActionFormState, HomepageSection } from './types';
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
    title: z.string(),
    subtitle: z.string(),
    imageUrl: z.string().url().optional(),
    buttonText: z.string().optional(),
    // 'features' will be handled manually in the action
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

// ... (other schemas remain the same)

export async function signup(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const validatedFields = userFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        const fieldErrors = validatedFields.error.flatten().fieldErrors;
        const errorMessages = Object.values(fieldErrors).flat(); 
        const descriptiveError = `Error de validación: ${errorMessages.join('. ')}.`;

        return {
            error: descriptiveError,
            errors: fieldErrors,
        };
    }
    
    const { email, password, name, lastName } = validatedFields.data;

    if (!password) {
        return { error: 'La contraseña es obligatoria para el registro.' };
    }

    let newUser;
    try {
        newUser = await adminAuth.createUser({
            email,
            password,
            displayName: `${name} ${lastName}`,
        });
        
        const customToken = await adminAuth.createCustomToken(newUser.uid);

        await createUser({
            id: newUser.uid,
            email,
            name, 
            lastName,
            role: 'ciclista' as const,
        });

        revalidatePath('/dashboard');

        return { 
            success: true, 
            message: "¡Cuenta creada exitosamente!",
            customToken: customToken,
        };

    } catch (error: any) {
        // ... (error handling)
    }
    return { error: 'Ocurrió un error inesperado.' };
}

// ... (updateProfile, registerBike, updateBike actions remain the same)

export async function updateHomepageSection(prevState: any, formData: FormData) {
    const validatedFields = homepageEditSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { error: 'Datos proporcionados no válidos.' };
    }
    
    // This is a simplified version that matches the current branch state.
    // It does not yet handle the full 'features' array.
    const data: Partial<HomepageSection> = {
        ...validatedFields.data,
    }
    await updateHomepageSectionData(data as HomepageSection);
    revalidatePath('/');
    return {
        message: `La sección '${validatedFields.data.id}' se actualizó correctamente.`,
    };
}


// ... (other actions remain the same)
export async function updateProfile(prevState: any, formData: FormData): Promise<ActionFormState> {
    const session = await getDecodedSession();
    if (!session?.uid || !session.email) {
        return { error: 'No estás autenticado. Por favor, inicia sesión de nuevo.' };
    }

    const formDataObject = Object.fromEntries(formData.entries());
    formDataObject.email = session.email;

    const validatedFields = userFormSchema.safeParse(formDataObject);

    if (!validatedFields.success) {
        const errorMessages = validatedFields.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        return {
            error: `Error de validación: ${errorMessages}`,
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { 
        id, name, lastName, 
        currentPassword, password, 
        ...otherProfileData 
    } = validatedFields.data;

    if (!id || id !== session.uid) {
        return { error: 'No autorizado para realizar esta acción.' };
    }

    const isAttemptingPasswordChange = !!currentPassword || !!password;

    try {
        if (isAttemptingPasswordChange) {
            if (!currentPassword || !password) {
                return { error: 'Para cambiar la contraseña, debes proporcionar la actual y la nueva.' };
            }
            const isPasswordValid = await verifyUserPassword(session.email, currentPassword);
            if (!isPasswordValid) {
                return { error: 'La contraseña actual no es correcta.' };
            }
            await adminAuth.updateUser(id, { password: password });
        }

        await adminAuth.updateUser(id, { displayName: `${name} ${lastName}` });
        
        const firestoreData = {
            name,
            lastName,
            birthDate: otherProfileData.birthDate,
            country: otherProfileData.country,
            state: otherProfileData.state,
            gender: otherProfileData.gender,
            postalCode: otherProfileData.postalCode,
            whatsapp: otherProfileData.whatsapp,
        };

        await updateUserData(id, firestoreData);
        revalidatePath('/dashboard/profile');
        return { success: true, message: 'Perfil actualizado correctamente.' };
        
    } catch (error: any) {
        console.error('UPDATE_PROFILE_ERROR:', error);
        return { error: error.message || 'Ocurrió un error inesperado al actualizar el perfil.' };
    }
}

export async function registerBike(prevState: any, formData: FormData) {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { message: 'Error: No estás autenticado.' };
    }

    const formDataObject = Object.fromEntries(formData.entries());
    const validatedFields = bikeFormSchema.safeParse(formDataObject);

    if (!validatedFields.success) {
        const errors = validatedFields.error.flatten().fieldErrors;
        const errorMessages = Object.entries(errors)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('; ');

        return {
            errors,
            message: `Error de validación. Revisa los siguientes campos: ${errorMessages}`,
        };
    }

    const { 
        photoUrl, 
        serialNumberPhotoUrl, 
        additionalPhoto1Url, 
        additionalPhoto2Url, 
        ownershipProofUrl, 
        serialNumber,
        ...bikeData 
    } = validatedFields.data;
    
    const isUnique = await isSerialNumberUnique(serialNumber);
    if (!isUnique) {
        return {
            errors: { serialNumber: ["Este número de serie ya está registrado."] },
            message: `Error: El número de serie '${serialNumber}' ya se encuentra registrado.`,
        };
    }
    
    const photos = [
        photoUrl,
        serialNumberPhotoUrl,
        additionalPhoto1Url,
        additionalPhoto2Url
    ].filter((url): url is string => !!url);

    try {
        await addBike({
            ...bikeData,
            userId: session.uid,
            serialNumber,
            photos,
            ownershipProof: ownershipProofUrl || '',
        });
    } catch (error) {
        return { message: 'Error de base de datos: No se pudo registrar la bicicleta.' };
    }

    revalidatePath('/dashboard');
    redirect('/dashboard');
}

export async function updateBike(prevState: any, formData: FormData) {
    const formDataObject = Object.fromEntries(formData.entries());
    const validatedFields = bikeFormSchema.safeParse(formDataObject);
  
    if (!validatedFields.success) {
        const errors = validatedFields.error.flatten().fieldErrors;
        const errorMessages = Object.entries(errors)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('; ');
      return {
        errors,
        message: `Error de validación. Revisa los siguientes campos: ${errorMessages}`,
      };
    }
  
    const { id, serialNumber, ...bikeData } = validatedFields.data;

    if (!id) {
        return { message: 'Error: ID de bicicleta no encontrado.' };
    }
  
    const isUnique = await isSerialNumberUnique(serialNumber, id);
    if (!isUnique) {
        return {
            errors: { serialNumber: ["Este número de serie ya está registrado."] },
            message: `Error: El número de serie '${serialNumber}' ya se encuentra registrado.`,
        };
    }

    const { 
        photoUrl, 
        serialNumberPhotoUrl, 
        additionalPhoto1Url, 
        additionalPhoto2Url, 
        ownershipProofUrl, 
        ...restBikeData 
    } = bikeData;

    const photos = [
        photoUrl,
        serialNumberPhotoUrl,
        additionalPhoto1Url,
        additionalPhoto2Url
    ].filter((url): url is string => !!url);
    
    try {
        await updateBikeData(id, {
            ...restBikeData,
            serialNumber,
            photos,
            ownershipProof: ownershipProofUrl || ''
        });
    } catch (error) {
        return { message: 'Error de base de datos: No se pudo actualizar la bicicleta.' };
    }
  
    revalidatePath(`/dashboard/bikes/${id}`);
    revalidatePath('/dashboard');
    return { success: true, message: 'Bicicleta actualizada correctamente.' };
}
export async function logout() {
    await deleteSession();
    redirect('/login');
}

export async function forceLogout() {
    await deleteSession();
}
