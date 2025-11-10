'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { addBike, isSerialNumberUnique, updateBikeData, updateBikeStatus, updateHomepageSectionData, updateUserData, createUser, verifyUserPassword, getUserByEmail, getBike } from './data';
import { deleteSession, getDecodedSession } from './auth';
import { firebaseConfig } from './firebase/config';
import { ActionFormState, HomepageSection } from './types';
import { userFormSchema } from './schemas';

// Helper function to handle optional string fields from forms
const optionalString = (schema: z.ZodString) => 
    z.preprocess((val) => (val === '' ? undefined : val), schema.optional());

const bikeFormSchema = z.object({
    id: z.string().optional(),
    serialNumber: z.string().min(3, "El número de serie es obligatorio."),
    make: z.string().min(2, "La marca es obligatoria."),
    model: z.string().min(1, "El modelo es obligatorio."),
    color: z.string().min(2, "El color es obligatorio."),
    
    // Apply the helper function to optional text fields
    modelYear: optionalString(z.string()),
    modality: optionalString(z.string()),
    
    photoUrl: z.string().url("URL de foto lateral inválida.").min(1, "La foto lateral es obligatoria."),
    serialNumberPhotoUrl: z.string().url("URL de foto de serie inválida.").min(1, "La foto del número de serie es obligatoria."),
    
    // Apply the helper function to optional URL fields
    additionalPhoto1Url: optionalString(z.string().url({ message: "URL de foto adicional 1 inválida." })),
    additionalPhoto2Url: optionalString(z.string().url({ message: "URL de foto adicional 2 inválida." })),
    ownershipProofUrl: optionalString(z.string().url({ message: "URL de prueba de propiedad inválida." })),
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
    time: z.string().optional(),
    country: z.string().min(1, "El país es obligatorio."),
    state: z.string().min(1, "El estado/provincia es obligatorio."),
    location: z.string().min(1, "La ubicación es obligatoria."),
    details: z.string().min(1, "Los detalles son obligatorios."),
});

const ownershipProofSchema = z.object({
    bikeId: z.string(),
    proofUrl: z.string().url("La URL del documento no es válida."),
});

const transferOwnershipSchema = z.object({
    bikeId: z.string(),
    newOwnerEmail: z.string().email("El correo electrónico no es válido."),
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

export async function updateOwnershipProof(bikeId: string, proofUrl: string) {
    const validatedFields = ownershipProofSchema.safeParse({ bikeId, proofUrl });

    if (!validatedFields.success) {
        throw new Error("Datos de prueba de propiedad no válidos.");
    }
    
    await updateBikeData(bikeId, { ownershipProof: proofUrl });
    
    revalidatePath(`/dashboard/bikes/${bikeId}`);
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
    return { success: true, message: "Reporte de robo enviado." };
}

export async function markAsRecovered(bikeId: string) {
    await updateBikeStatus(bikeId, 'safe');
    revalidatePath(`/dashboard/bikes/${bikeId}`);
    revalidatePath('/dashboard');
}

export async function transferOwnership(prevState: any, formData: FormData): Promise<ActionFormState> {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { error: 'No estás autenticado.' };
    }

    const validatedFields = transferOwnershipSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { 
            error: 'El correo electrónico proporcionado no es válido.',
            errors: validatedFields.error.flatten().fieldErrors 
        };
    }

    const { bikeId, newOwnerEmail } = validatedFields.data;

    if (session.email === newOwnerEmail) {
        return { error: 'No puedes transferir una bicicleta a ti mismo.' };
    }

    try {
        const bike = await getBike(bikeId);
        if (bike?.userId !== session.uid) {
            return { error: 'No autorizado. No eres el propietario de esta bicicleta.' };
        }
        
        const newOwner = await getUserByEmail(newOwnerEmail);
        if (!newOwner) {
            return { error: 'No se encontró ningún usuario con ese correo electrónico.' };
        }

        await updateBikeData(bikeId, { userId: newOwner.id });

    } catch (error: any) {
        console.error("TRANSFER_OWNERSHIP_ERROR:", error);
        return { error: 'Ocurrió un error inesperado durante la transferencia.' };
    }
    
    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/bikes/${bikeId}`);
    redirect('/dashboard');
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
