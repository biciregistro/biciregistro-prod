'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getStorage } from 'firebase-admin/storage';
import { getDecodedSession } from '@/lib/auth';
import { adminAuth, adminDb } from '@/lib/firebase/server';
import { BikeRegistrationSchema } from '@/lib/schemas';
import { BikeFormState } from '@/lib/types';
import { 
    addBike, 
    updateBikeData, 
    isSerialNumberUnique, 
    getBike, 
    getUserByEmail 
} from '@/lib/data';
import crypto from 'crypto';

// --- Schemas y Helpers ---

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

const theftReportSchema = z.object({
    bikeId: z.string(),
    date: z.string().min(1, "La fecha es obligatoria."),
    time: z.string().optional(),
    country: z.string().min(1, "El país es obligatorio."),
    state: z.string().min(1, "El estado/provincia es obligatorio."),
    city: z.string().min(1, "El municipio/ciudad es obligatorio."),
    zipCode: z.string().optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    location: z.string().min(1, "La ubicación es obligatoria."),
    details: z.string().min(1, "Los detalles son obligatorios."),
    // HU-01: Add optional reward field with numeric validation.
    reward: z.preprocess(
        (val) => val || undefined, // Treat empty string or null as undefined, making it optional.
        z.string()
         .regex(/^[0-9]+$/, { message: "La recompensa solo debe contener números." })
         .optional()
    ),
});

// Helper interno para subir imagen Base64 y obtener URL PÚBLICA con Token
async function uploadBase64Image(base64String: string, path: string) {
    try {
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) {
            console.error("Storage Bucket not configured: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET missing");
            throw new Error("Storage configuration error");
        }

        const bucket = getStorage().bucket(bucketName);
        // Eliminar prefijo data:image/xyz;base64,
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const file = bucket.file(path);
        
        // Generar un token de descarga
        const token = crypto.randomUUID();

        await file.save(buffer, {
            metadata: {
                contentType: 'image/jpeg',
                metadata: {
                    firebaseStorageDownloadTokens: token, // Asignar el token
                }
            },
        });

        // Usamos la URL pública directa de Firebase Storage CON EL TOKEN
        const encodedPath = encodeURIComponent(path);
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
        
        return publicUrl;
    } catch (error) {
        console.error("Upload Error:", error);
        return null;
    }
}

// --- Actions ---

export async function registerBike(prevState: BikeFormState, formData: FormData): Promise<BikeFormState> {
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
            ownershipProof: ownershipProofUrl || '',
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
            ownershipProof: ownershipProofUrl || '',
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
        return;
    }
    try {
        // Change status to 'recovered' instead of 'safe'
        // Do NOT delete theftReport to preserve history for analytics
        await updateBikeData(bikeId, {
            status: 'recovered',
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

export async function transferOwnership(prevState: { error?: string; success?: boolean }, formData: FormData): Promise<{ error?: string; success?: boolean }> {
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
        
        const bike = await getBike(currentUserId, bikeId);
        if (!bike) {
            return { error: 'No estás autorizado para transferir esta bicicleta.' };
        }

        await updateBikeData(bikeId, { userId: newOwner.id });
        
        revalidatePath('/dashboard');
        
        return { success: true };

    } catch (error) {
        console.error('Error al transferir la propiedad:', error);
        return { error: 'Ocurrió un error en el servidor. Por favor, inténtalo de nuevo.' };
    }
}

export async function registerBikeWizardAction(formData: any) {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { success: false, message: 'No estás autenticado. Por favor inicia sesión.' };
    }

    try {
        const userId = session.uid;
        const photoUrls: string[] = [];

        // 1. Upload Images to Storage
        if (formData.bikeImage) {
            const path = `bike-photos/${userId}/${Date.now()}_main.jpg`;
            const url = await uploadBase64Image(formData.bikeImage, path);
            if (url) photoUrls.push(url);
        }
        
        if (formData.serialImage) {
            const path = `serial-photos/${userId}/${Date.now()}_serial.jpg`;
            const url = await uploadBase64Image(formData.serialImage, path);
            if (url) photoUrls.push(url);
        }

        const isUnique = await isSerialNumberUnique(formData.serialNumber);
        if (!isUnique) {
            return {
                success: false,
                message: `Error: El número de serie '${formData.serialNumber}' ya se encuentra registrado.`,
            };
        }

        await addBike({
            userId,
            serialNumber: formData.serialNumber,
            make: formData.brand,
            model: formData.model,
            color: formData.color,
            modality: formData.type,
            modelYear: formData.year,
            appraisedValue: parseFloat(formData.value),
            ownershipProof: '',
            photos: photoUrls,
        });

        revalidatePath('/dashboard');
        return { success: true, message: '¡Bicicleta registrada exitosamente con Sprock!' };

    } catch (error: any) {
        console.error("Wizard Registration Error:", error);
        return { success: false, message: error.message || "Error al registrar la bicicleta." };
    }
}

export async function validateSerialNumberAction(serialNumber: string) {
    const isUnique = await isSerialNumberUnique(serialNumber);
    if (!isUnique) {
        return { exists: true, message: "Este número de serie ya está registrado." };
    }
    return { exists: false };
}
