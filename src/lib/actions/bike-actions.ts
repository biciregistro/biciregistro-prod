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
    getUserByEmail,
    getUser 
} from '@/lib/data';
import crypto from 'crypto';
import { sendTheftAlert } from '@/lib/notifications/service';
import { FieldValue } from 'firebase-admin/firestore';
import { headers } from 'next/headers';

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
    thiefDetails: z.string().optional(), 
    reward: z.preprocess(
        (val) => val || undefined,
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
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const file = bucket.file(path);
        
        const token = crypto.randomUUID();

        await file.save(buffer, {
            metadata: {
                contentType: 'image/jpeg',
                metadata: {
                    firebaseStorageDownloadTokens: token,
                }
            },
        });

        const encodedPath = encodeURIComponent(path);
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
        
        return publicUrl;
    } catch (error) {
        console.error("Upload Error:", error);
        return null;
    }
}

// Helper para obtener IP
async function getClientIp(): Promise<string | undefined> {
    const headerList = await headers();
    const forwardedFor = headerList.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    // En entornos locales o sin proxy, podría no estar disponible fácilmente desde headers
    // pero para App Hosting/Vercel/Cloud Run, x-forwarded-for es el estándar.
    return undefined;
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
        // Capturar IP
        const ip = await getClientIp();

        await addBike({
            ...bikeData,
            userId: session.uid,
            serialNumber,
            ownershipProof: ownershipProofUrl || '',
            registrationIp: ip,
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

        try {
            const bike = await getBike(session.uid, bikeId);
            if (bike) {
                const owner = await getUser(session.uid);
                if (owner) {
                    const ownerName = owner.name + (owner.lastName ? ` ${owner.lastName}` : '');
                    const ownerPhone = owner.whatsapp || owner.email;

                    await sendTheftAlert(bikeId, {
                        make: bike.make,
                        model: bike.model,
                        color: bike.color,
                        location: theftData.location,
                        city: theftData.city,
                        reward: theftData.reward,
                        ownerName: ownerName,
                        ownerPhone: ownerPhone
                    });
                }
            }
        } catch (notificationError) {
            console.error("Failed to send theft alert notification:", notificationError);
        }

        revalidatePath('/dashboard');
        revalidatePath(`/dashboard/bikes/${bikeId}`);
        revalidatePath('/admin'); // Revalidar admin panel para ver la nueva alerta
        return { message: 'El robo ha sido reportado exitosamente.' };
    } catch (error) {
        console.error("Error reporting theft:", error);
        return { message: 'Error de base de datos: No se pudo reportar el robo.' };
    }
}


export async function markAsRecovered(bikeId: string) {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return;
    }
    try {
        await updateBikeData(bikeId, {
            status: 'recovered',
        });
        revalidatePath('/dashboard');
        revalidatePath(`/dashboard/bikes/${bikeId}`);
        revalidatePath('/admin');
    } catch (error) {
        console.error("Failed to mark as recovered:", error);
    }
}

// NUEVA ACCIÓN PARA ADMIN: Marcar bicicleta como compartida socialmente
export async function markBikeAsSharedAction(bikeId: string) {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { success: false, message: 'No estás autenticado.' };
    }

    try {
        // Solo administradores pueden marcar como compartido (Verificación simple de rol en Firestore)
        const userDoc = await adminDb.collection('users').doc(session.uid).get();
        const userData = userDoc.data();
        
        if (userData?.role !== 'admin') {
            return { success: false, message: 'No tienes permisos para realizar esta acción.' };
        }

        await updateBikeData(bikeId, {
            adminSharedAt: new Date().toISOString()
        });

        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        console.error("Error marking bike as shared:", error);
        return { success: false, message: 'No se pudo actualizar el estado de difusión.' };
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

        // Capturar IP
        const ip = await getClientIp();

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
            registrationIp: ip,
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

export async function saveFCMToken(token: string) {
    const session = await getDecodedSession();
    if (!session?.uid) return { success: false };

    try {
        await adminDb.collection('users').doc(session.uid).update({
            fcmTokens: FieldValue.arrayUnion(token)
        });
        return { success: true };
    } catch (error) {
        console.error("Error saving FCM token:", error);
        return { success: false };
    }
}

export async function getReverseGeocoding(lat: number, lng: number) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'BiciRegistroApp/1.0 (contacto@biciregistro.mx)', 
                    'Accept-Language': 'es-MX,es;q=0.9'
                }
            }
        );

        if (!response.ok) {
            return { error: 'No se pudo obtener la dirección del servidor de mapas.' };
        }

        const data = await response.json();
        return { success: true, data };

    } catch (error) {
        console.error("Server Geocoding Error:", error);
        return { error: 'Error de conexión con el servicio de mapas.' };
    }
}
