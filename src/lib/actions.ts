'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { addBike, findUserByEmail, updateBikeData, updateBikeStatus, updateHomepageSectionData, updateUserData, createUser, getUserById } from './data';
import { createSession, deleteSession } from './auth';
import { getAuth } from 'firebase-admin/auth';
import { auth } from 'firebase-admin';
import { profileFormSchema } from './schemas';
import { HomepageSection } from './types';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = z.object({
    name: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    newPassword: z.string().min(6),
});

// Updated schema to include photo URLs
const bikeFormSchema = z.object({
    id: z.string().optional(),
    serialNumber: z.string().min(3, "El número de serie es obligatorio."),
    make: z.string().min(2, "La marca es obligatoria."),
    model: z.string().min(1, "El modelo es obligatorio."),
    color: z.string().min(2, "El color es obligatorio."),
    modelYear: z.string().optional(),
    modality: z.string().optional(),
    userId: z.string(),
    // URLs from hidden inputs
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


export async function login(prevState: any, formData: FormData) {
  const validatedFields = loginSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      error: 'Correo electrónico o contraseña no válidos.',
    };
  }
  const { email, password } = validatedFields.data;

  try {
    // This is a client-side call that we are using in a server action
    // In a production app, you'd likely have an API route or a different flow
    // For this prototype, we'll use a temporary, less secure method to get the token
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`, {
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

export async function signup(prevState: any, formData: FormData) {
    const validatedFields = profileFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
      return {
        message: 'Datos proporcionados no válidos. Asegúrate de que las contraseñas coincidan y cumplan con los requisitos.',
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }
    
    const { email, newPassword, name, lastName, ...rest } = validatedFields.data;
    
    if(!newPassword) {
        return { error: 'La contraseña es obligatoria.' };
    }

    let userCredential;
    try {
        userCredential = await auth().createUser({
            email,
            password: newPassword,
            displayName: `${name} ${lastName}`,
        });

        const newUser = {
            id: userCredential.uid,
            email,
            name,
            lastName,
            role: 'ciclista' as const, // default role
             ...rest
        };

        await createUser(newUser);

        return { message: '¡Cuenta creada con éxito! Ahora puedes iniciar sesión.' };
    } catch (error: any) {
        // Log the full error to the server console for detailed debugging
        console.error("SIGNUP_ACTION_ERROR:", JSON.stringify(error, null, 2));
        
        // If the user was somehow created in Auth but Firestore failed, delete the Auth user.
        if (userCredential) {
            await auth().deleteUser(userCredential.uid);
        }

        // Handle specific, known Firebase Auth errors
        switch (error.code) {
            case 'auth/email-already-exists':
                return { error: 'El correo electrónico ya está en uso por otra cuenta.' };
            case 'auth/invalid-email':
                return { error: 'El formato del correo electrónico no es válido.' };
            case 'auth/weak-password':
                return { error: 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.' };
            case 'auth/operation-not-allowed':
                return { error: 'El registro por correo electrónico y contraseña no está habilitado.' };
            default:
                 // Provide a generic but informative error for all other cases
                return { error: 'Ocurrió un error inesperado durante el registro. Revisa los logs del servidor para más detalles.' };
        }
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
         // Handle password change in Firebase Auth
        if (newPassword) {
            // In a real app, you'd need to reauthenticate the user to change password.
            // This is complex from a server action. For this prototype, we'll update it directly
            // This requires admin privileges.
            await auth().updateUser(id, { password: newPassword });
            console.log(`Password updated for user ${id}`);
        }

        // Update user display name in Firebase Auth
        await auth().updateUser(id, { displayName: `${userData.name} ${userData.lastName}` });

        // Update user data in Firestore
        await updateUserData(id, userData);

        console.log('User profile updated:', id);
        revalidatePath('/dashboard/profile');
        
        return { message: 'Perfil actualizado correctamente.' };
    } catch (error) {
        console.error('Update profile error:', error);
        return {
            error: 'Ocurrió un error al actualizar el perfil.',
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
    
    // Create a clean array of photo URLs, filtering out any empty optional ones
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
    // This needs to be updated to handle photo URLs as well if you want to edit them.
    // For now, it only updates the text fields.
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
