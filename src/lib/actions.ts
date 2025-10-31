'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { addBike, findUserByEmail, updateBikeData, updateBikeStatus, updateHomepageSectionData } from './data';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = z.object({
    name: z.string().min(2),
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

export async function reportTheft(bikeId: string) {
    updateBikeStatus(bikeId, 'stolen');
    console.log(`Bicicleta ${bikeId} reportada como robada.`);
    revalidatePath(`/dashboard/bikes/${bikeId}`);
    revalidatePath('/dashboard');
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
