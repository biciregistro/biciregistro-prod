'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { addBike, updateBikeData, updateBikeStatus, updateHomepageSectionData, updateUserData, createUser, getUserById } from './data';
import { createSession, deleteSession } from './auth';
import { adminAuth } from './firebase/server';
import { firebaseConfig } from './firebase/client';
import { ActionFormState, HomepageSection } from './types';
// CORRECT: Importing the single source of truth for schemas
import { profileFormSchema, signupSchema } from './schemas';

// This schema is for the login form, it's fine to keep it here.
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// This schema is specific to bike registration, it's fine.
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

// Other local schemas that are not causing issues
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


export async function login(prevState: any, formData: FormData) {
  const validatedFields = loginSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      error: 'Correo electrónico o contraseña no válidos.',
    };
  }
  const { email, password } = validatedFields.data;

  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
    });

    const result = await response.json();
    
    if (!response.ok) {
        return { error: 'Credenciales no válidas.' };
    }

    await createSession(result.idToken);
    redirect('/dashboard');

  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Ocurrió un error durante el inicio de sesión.' };
  }
}

export async function signup(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const validatedFields = signupSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
      return {
        error: 'Datos proporcionados no válidos. Asegúrate de que las contraseñas coincidan y cumplan los requisitos.',
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }
    
    const { email, password, name, lastName } = validatedFields.data;

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
            console.error("SIGNUP_API_ERROR:", detailedError);
            return { error: `Error de Firebase: ${detailedError}` };
        }

        await adminAuth.updateUser(firebaseSignupResult.localId, {
            displayName: `${name} ${lastName}`,
        });
        
        // Create a custom token for client-side sign-in
        const customToken = await adminAuth.createCustomToken(firebaseSignupResult.localId);

        const newUser = {
            id: firebaseSignupResult.localId,
            email,
            name,
            lastName,
            role: 'ciclista' as const,
        };
        await createUser(newUser);

        revalidatePath('/dashboard');

        return { 
            success: true, 
            message: "¡Cuenta creada exitosamente!",
            customToken: customToken, // Send token to the client
        };

    } catch (error: any) {
        console.error("SIGNUP_ACTION_ERROR:", JSON.stringify(error, null, 2));
        
        if (firebaseSignupResult?.localId) {
            await adminAuth.deleteUser(firebaseSignupResult.localId);
        }
        
        return { error: 'Ocurrió un error inesperado durante el registro.' };
    }
}

export async function updateProfile(prevState: any, formData: FormData) {
    const validatedFields = profileFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Error: Por favor, revisa los campos del formulario.',
        };
    }

    const { id, currentPassword, newPassword, ...userData } = validatedFields.data;
    
    if (!id) {
        return {
            error: 'Error: No se pudo identificar al usuario.',
        }
    }
    
    try {
        if (newPassword) {
            await adminAuth.updateUser(id, { password: newPassword });
            console.log(`Password updated for user ${id}`);
        }

        await adminAuth.updateUser(id, { displayName: `${userData.name} ${userData.lastName}` });
        await updateUserData(id, userData);

        console.log('User profile updated in Firestore:', id);
        revalidatePath('/dashboard/profile');
        
        return { message: 'Perfil actualizado correctamente.' };
    } catch (error: any) {
        console.error('Update profile error:', error);
        return {
             error: error.message || 'Ocurrió un error al actualizar el perfil.',
        }
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

    addBike({
        ...bikeData,
        photos,
        ownershipProof: ownershipProofUrl || '',
    });

    console.log('Bike registered:', validatedFields.data.serialNumber);
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
            errors: true,
            message: 'Error: ID de bicicleta no encontrado.',
        };
    }
  
    updateBikeData(id, bikeData);
  
    console.log('Bike updated:', id);
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
    updateBikeStatus(bikeId, 'stolen', theftDetails);
    console.log(`Bicicleta ${bikeId} reportada como robada.`);
    revalidatePath(`/dashboard/bikes/${bikeId}`);
    revalidatePath('/dashboard');
    return { message: "Reporte de robo enviado." };
}

export async function markAsRecovered(bikeId: string) {
    updateBikeStatus(bikeId, 'safe');
    console.log(`Bicicleta ${bikeId} marcada como recuperada.`);
    revalidatePath(`/dashboard/bikes/${bikeId}`);
    revalidatePath('/dashboard');
}

export async function updateHomepageSection(prevState: any, formData: FormData) {
    const validatedFields = homepageEditSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            error: 'Datos proporcionados no válidos.',
        };
    }
    
    const data: HomepageSection = {
        ...validatedFields.data,
        content: validatedFields.data.content || '',
    }
    updateHomepageSectionData(data);
    console.log('Homepage section updated:', validatedFields.data.id);

    revalidatePath('/');
    return {
        message: `La sección '${validatedFields.data.id}' se actualizó correctamente.`,
    };
}

export async function logout() {
    await deleteSession();
    redirect('/login');
}
