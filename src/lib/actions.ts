'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { addBike, updateBikeData, updateBikeStatus, updateHomepageSectionData, updateUserData, createUser, verifyUserPassword } from './data';
import { deleteSession, getDecodedSession } from './auth';
import { firebaseConfig } from './firebase/config';
import { ActionFormState, HomepageSection } from './types';
import { userFormSchema } from './schemas'; // <-- SINGLE UNIFIED SCHEMA

const bikeFormSchema = z.object({
    id: z.string().optional(),
    serialNumber: z.string().min(3, "El número de serie es obligatorio."),
    make: z.string().min(2, "La marca es obligatoria."),
    model: z.string().min(1, "El modelo es obligatorio."),
    color: z.string().min(2, "El color es obligatorio."),
    modelYear: z.string().optional(),
    modality: z.string().optional(),
    userId: z.string(),
    photoUrl: z.string().url("URL de foto lateral inválida.").min(1, "La foto lateral es obligatoria."),
    serialNumberPhotoUrl: z.string().url("URL de foto de serie inválida.").min(1, "La foto del número de serie es obligatoria."),
    additionalPhoto1Url: z.string().url("URL de foto adicional 1 inválida.").optional(),
    additionalPhoto2Url: z.string().url("URL de foto adicional 2 inválida.").optional(),
    ownershipProofUrl: z.string().url("URL de prueba de propiedad inválida.").optional(),
});

const homepageEditSchema = z.object({
    id: z.enum(['hero', 'features', 'cta']),
    title: z.string(),
    subtitle: z.string(),
    content: z.string().optional(),
    imageUrl: z.string().url().optional(),
});

const theftReportSchema = z.object({
    bikeId: z.string(),
    date: z.string().min(1, "La fecha es obligatoria."),
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
    
    const { email, password, name, lastName } = validatedFields.data;

    if (!password) {
        return { error: 'La contraseña es obligatoria para el registro.' };
    }

    let firebaseSignupResult;
    try {
        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        });

        firebaseSignupResult = await response.json();
        
        if (!response.ok) {
            if (firebaseSignupResult.error?.message === 'EMAIL_EXISTS') {
                return { error: 'El correo electrónico ya está en uso por otra cuenta.' };
            }
            const detailedError = firebaseSignupResult.error?.message || 'Ocurrió un error durante el registro.';
            return { error: `Error de Firebase: ${detailedError}` };
        }

        const { adminAuth } = await import('./firebase/server');
        if (!adminAuth) {
            throw new Error("Firebase Admin SDK no está inicializado.");
        }
        await adminAuth.updateUser(firebaseSignupResult.localId, {
            displayName: `${name} ${lastName}`,
        });
        
        const customToken = await adminAuth.createCustomToken(firebaseSignupResult.localId);

        await createUser({
            id: firebaseSignupResult.localId,
            email, name, lastName,
            role: 'ciclista' as const,
        });

        revalidatePath('/dashboard');

        return { 
            success: true, 
            message: "¡Cuenta creada exitosamente!",
            customToken: customToken,
        };

    } catch (error: any) {
        console.error("SIGNUP_ACTION_ERROR:", error);
        if (firebaseSignupResult?.localId) {
            const { adminAuth } = await import('./firebase/server');
            if (adminAuth) await adminAuth.deleteUser(firebaseSignupResult.localId);
        }
        return { error: 'Ocurrió un error inesperado durante el registro.' };
    }
}

export async function updateProfile(prevState: any, formData: FormData): Promise<ActionFormState> {
    const session = await getDecodedSession();
    if (!session?.uid || !session.email) {
        return { error: 'No estás autenticado. Por favor, inicia sesión de nuevo.' };
    }

    const formDataObject = Object.fromEntries(formData.entries());
    // Add the email from the secure session to the form data before validation
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
        const { adminAuth } = await import('./firebase/server');
        if (!adminAuth) {
            throw new Error("Firebase Admin SDK no está inicializado.");
        }

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
    const validatedFields = bikeFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Error: Por favor, revisa los campos del formulario. Asegúrate de subir las fotos obligatorias.',
        };
    }

    const { 
        photoUrl, 
        serialNumberPhotoUrl, 
        additionalPhoto1Url, 
        additionalPhoto2Url, 
        ownershipProofUrl, 
        ...bikeData 
    } = validatedFields.data;
    
    const photos = [
        photoUrl,
        serialNumberPhotoUrl,
        additionalPhoto1Url,
        additionalPhoto2Url
    ].filter((url): url is string => !!url);

    await addBike({
        ...bikeData,
        photos,
        ownershipProof: ownershipProofUrl || '',
    });

    revalidatePath('/dashboard');
    redirect('/dashboard');
}


export async function updateBike(prevState: any, formData: FormData) {
    const validatedFields = bikeFormSchema.safeParse(Object.fromEntries(formData.entries()));
  
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Error: Por favor, revisa los campos del formulario.',
      };
    }
  
    const { id, ...bikeData } = validatedFields.data;

    if (!id) {
        return {
            errors: {},
            message: 'Error: ID de bicicleta no encontrado.',
        };
    }
  
    await updateBikeData(id, bikeData);
  
    revalidatePath(`/dashboard/bikes/${id}`);
    revalidatePath('/dashboard');

    return { message: 'Bicicleta actualizada correctamente.' };
}

export async function reportTheft(prevState: any, formData: FormData) {
    const validatedFields = theftReportSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Error: Por favor, completa todos los campos.',
        };
    }
    const { bikeId, ...theftDetails } = validatedFields.data;
    await updateBikeStatus(bikeId, 'stolen', theftDetails);
    revalidatePath(`/dashboard/bikes/${bikeId}`);
    revalidatePath('/dashboard');
    return { message: "Reporte de robo enviado." };
}

export async function markAsRecovered(bikeId: string) {
    await updateBikeStatus(bikeId, 'safe');
    revalidatePath(`/dashboard/bikes/${bikeId}`);
    revalidatePath('/dashboard');
}

export async function updateHomepageSection(prevState: any, formData: FormData) {
    const validatedFields = homepageEditSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { error: 'Datos proporcionados no válidos.' };
    }
    
    const data: HomepageSection = {
        ...validatedFields.data,
        content: validatedFields.data.content || '',
    }
    await updateHomepageSectionData(data);

    revalidatePath('/');
    return {
        message: `La sección '${validatedFields.data.id}' se actualizó correctamente.`,
    };
}

export async function logout() {
    await deleteSession();
    redirect('/login');
}

export async function forceLogout() {
    await deleteSession();
}
