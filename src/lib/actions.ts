'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { addBike, findUserByEmail, updateBikeData, updateBikeStatus, updateHomepageSectionData, updateUserData, createUser, getUserById } from './data';
import { createSession, deleteSession } from './auth';
import { getAuth } from 'firebase-admin/auth';
import { auth } from 'firebase-admin';

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

const bikeFormSchema = z.object({
    id: z.string().optional(),
    serialNumber: z.string().min(3, "El número de serie es obligatorio."),
    make: z.string().min(2, "La marca es obligatoria."),
    model: z.string().min(1, "El modelo es obligatorio."),
    color: z.string().min(2, "El color es obligatorio."),
    modelYear: z.string().optional(),
    modality: z.string().optional(),
    userId: z.string(), // This will be hidden and pre-filled
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

const profileFormSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "El nombre es obligatorio."),
    lastName: z.string().min(2, "Los apellidos son obligatorios."),
    email: z.string().email("El correo electrónico no es válido."),
    birthDate: z.string().min(1, "La fecha de nacimiento es obligatoria."),
    country: z.string().min(1, "El país es obligatorio."),
    state: z.string().min(1, "El estado es obligatorio."),
    gender: z.enum(['masculino', 'femenino', 'otro'], {
        required_error: "Debes seleccionar un género.",
    }),
    postalCode: z.string().min(1, "El código postal es obligatorio."),
    whatsapp: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
}).refine(data => {
    if (data.newPassword || data.confirmPassword) {
        return data.newPassword === data.confirmPassword;
    }
    return true;
}, {
    message: "Las nuevas contraseñas no coinciden.",
    path: ["confirmPassword"],
}).refine(data => {
    // For signup, newPassword is required and must follow rules
    if (!data.id) { 
        if (!data.newPassword) return false;
        return /^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9])(?=.*[a-z]).{6,}$/.test(data.newPassword);
    }
    // For profile update, it's optional but must follow rules if present
    if (data.newPassword) {
        return /^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9])(?=.*[a-z]).{6,}$/.test(data.newPassword);
    }
    return true;
}, {
    message: "La contraseña debe tener al menos 6 caracteres, una mayúscula, un número y un carácter especial.",
    path: ["newPassword"],
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
        error: 'Datos proporcionados no válidos. Asegúrate de que las contraseñas coincidan y cumplan con los requisitos.',
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }
    
    const { email, newPassword, name, lastName, ...rest } = validatedFields.data;
    
    if(!newPassword) {
        return { error: 'La contraseña es obligatoria.' };
    }

    try {
        const userCredential = await auth().createUser({
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
        if (error.code === 'auth/email-already-exists') {
            return { error: 'El correo electrónico ya está en uso.' };
        }
        console.error('Signup error:', error);
        return { error: 'Ocurrió un error durante el registro.' };
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
            errors: { form: ['ID de usuario no encontrado.'] },
            message: 'Error: No se pudo identificar al usuario.',
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
            errors: { form: ['Ocurrió un error al actualizar el perfil.'] },
            message: 'Ocurrió un error al actualizar el perfil.',
        }
    }
}

export async function registerBike(prevState: any, formData: FormData) {
    const validatedFields = bikeFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Error: Por favor, revisa los campos del formulario.',
        };
    }

    addBike({
        ...validatedFields.data,
        photos: [], // In real app, upload and get URLs
        ownershipDocs: [],
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
    
    updateHomepageSectionData(validatedFields.data);
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
