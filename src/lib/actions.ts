'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { addBike, findUserByEmail, updateBikeData, updateBikeStatus, updateHomepageSectionData, updateUserData } from './data';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = z.object({
    name: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
});

const bikeFormSchema = z.object({
    id: z.string().optional(),
    serialNumber: z.string().min(3, "El número de serie es obligatorio."),
    make: z.string().min(2, "La marca es obligatoria."),
    model: z.string().min(1, "El modelo es obligatorio."),
    color: z.string().min(2, "El color es obligatorio."),
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
    id: z.string(),
    name: z.string().min(2, "El nombre es obligatorio."),
    lastName: z.string().min(2, "Los apellidos son obligatorios."),
    birthDate: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    gender: z.enum(['masculino', 'femenino', 'otro']).optional(),
    postalCode: z.string().optional(),
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
    if (data.newPassword) {
        return data.newPassword.length >= 6;
    }
    return true;
}, {
    message: "La nueva contraseña debe tener al menos 6 caracteres.",
    path: ["newPassword"],
});


export async function login(prevState: any, formData: FormData) {
  const validatedFields = loginSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      error: 'Correo electrónico o contraseña no válidos.',
    };
  }

  const { email } = validatedFields.data;
  const user = await findUserByEmail(email);

  if(!user) {
    return {
        error: 'No se encontró ningún usuario con este correo electrónico.',
    };
  }

  // In a real app, you would verify the password here.
  // For mock purposes, we'll assume it's correct and set a cookie/session.
  console.log('User logged in:', user.email);

  redirect('/dashboard');
}

export async function signup(prevState: any, formData: FormData) {
  const validatedFields = signupSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      error: 'Datos proporcionados no válidos.',
    };
  }

  // In a real app, you'd create the user in the database.
  console.log('New user signed up:', validatedFields.data.email);

  redirect('/dashboard');
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

    // Handle password change
    if (newPassword && currentPassword) {
        // In a real app, you'd verify the current password here before updating.
        console.log(`Password change requested for user ${id}.`);
        // For now, we just log it. A real implementation would update the password hash.
    }

    updateUserData(id, userData);

    console.log('User profile updated:', id);
    revalidatePath('/dashboard/profile');
    
    return { message: 'Perfil actualizado correctamente.' };
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
