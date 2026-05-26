'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getStorage } from 'firebase-admin/storage';
import { getDecodedSession } from '@/lib/auth';
import { adminAuth, adminDb } from '@/lib/firebase/server';
import { BikeRegistrationSchema } from '@/lib/schemas';
import { BikeFormState, Modality } from '@/lib/types';
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
import { awardPoints } from './gamification-actions';

// --- Schemas y Helpers ---

const optionalString = (schema: z.ZodString) =>
    z.preprocess((val) => (val === '' ? undefined : val), schema.optional());

const bikeFormSchema = BikeRegistrationSchema.extend({
    id: z.string().optional(),
    photoUrl: z.string().url("Debes subir una foto lateral de tu bicicleta.").min(1, "La foto lateral es obligatoria."),
    serialNumberPhotoUrl: optionalString(z.string().url({ message: "URL de foto de serie inválida." })),
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
    contactProfile: z.string().min(1, "El perfil de Instagram o Facebook es obligatorio."),
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
    return undefined;
}

// --- INTELLIGENCE & SECURITY HELPERS ---

function isExactMatch(biSerial: string | null | undefined, ourSerial: string): boolean {
    if (!biSerial) return false;
    const cleanBi = biSerial.replace(/[\s-]+/g, '').toUpperCase();
    const cleanOur = ourSerial.replace(/[\s-]+/g, '').toUpperCase();
    return cleanBi === cleanOur;
}

/**
 * Consulta a Bike Index para verificar si un serial está robado internacionalmente
 */
async function checkBikeIndexForTheft(serialNumber: string): Promise<boolean> {
    try {
        const cleanSerialForBi = serialNumber.replace(/[\s-]+/g, '').toUpperCase();
        const biUrl = `https://bikeindex.org/api/v3/search?serial=${encodeURIComponent(cleanSerialForBi)}&stolenness=stolen`;
        
        const biRes = await fetch(biUrl, { next: { revalidate: 3600 } }); 
        
        if (biRes.ok) {
            const biData = await biRes.json();
            if (biData.bikes && biData.bikes.length > 0) {
                const isStolen = biData.bikes.some((b: any) => b.stolen && isExactMatch(b.serial, cleanSerialForBi));
                return isStolen;
            }
        }
        return false;
    } catch (error) {
        console.error("Error validando en Bike Index (fallo silencioso, se asume limpia):", error);
        return false; // Fail-open para no bloquear el negocio si se cae BikeIndex
    }
}

/**
 * Registra silenciosamente un intento de registro fraudulento (Fire-and-forget)
 */
async function logFraudAttempt(userId: string, serialNumber: string, source: 'local' | 'bike_index', ip: string | undefined) {
    try {
        // En un bloque try-catch separado para no tumbar la petición principal
        adminDb.collection('fraud-attempts').add({
            userId,
            serialNumber: serialNumber.trim().toUpperCase(),
            source,
            ipAddress: ip || 'unknown',
            attemptedAt: new Date().toISOString()
        });
    } catch (e) {
        console.error("No se pudo guardar el log de fraude", e);
    }
}

// --- Actions ---

export async function registerBike(prevState: any, formData: FormData): Promise<any> {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { success: false, message: 'No estás autenticado.' };
    }

    const validatedFields = bikeFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        const errors = validatedFields.error.flatten().fieldErrors;
        
        // Si falta la foto lateral
        if (errors.photoUrl) {
            return { success: false, message: 'Falta información requerida: Por favor, sube la Foto Lateral de tu bicicleta.' };
        }

        return {
            success: false,
            message: 'Error de validación. Por favor, revisa los campos del formulario.',
            errors: errors,
        };
    }

    const { photoUrl, serialNumberPhotoUrl, additionalPhoto1Url, additionalPhoto2Url, ownershipProofUrl, serialNumber, ...bikeData } = validatedFields.data;
    
    const ip = await getClientIp();

    // 1. VALIDACIÓN LOCAL
    const isUnique = await isSerialNumberUnique(serialNumber);
    if (!isUnique) {
        // Ejecutamos tracking silencioso de fraude local
        logFraudAttempt(session.uid, serialNumber, 'local', ip);

        return {
            success: false,
            message: `Error: El número de serie '${serialNumber}' ya se encuentra registrado en la plataforma.`,
            errors: { serialNumber: ["Este número de serie ya está registrado."] },
        };
    }

    // 2. VALIDACIÓN INTERNACIONAL (BIKE INDEX)
    const isStolenInternationally = await checkBikeIndexForTheft(serialNumber);
    if (isStolenInternationally) {
         // Ejecutamos tracking silencioso de fraude internacional
         logFraudAttempt(session.uid, serialNumber, 'bike_index', ip);

         return {
            success: false,
            message: `Alerta de Seguridad: No podemos registrar esta bicicleta porque cuenta con un reporte internacional de robo activo.`,
            errors: { serialNumber: ["Reporte de robo internacional detectado (Bike Index)."] },
        };
    }

    // 3. REGISTRO EXITOSO
    try {
        // OBTENER DATOS DEL USUARIO PARA DESNORMALIZACIÓN
        const owner = await getUser(session.uid);
        if (!owner) throw new Error("Owner not found");

        const denormalizedData = {
            ownerGender: owner.gender,
            ownerBirthDate: owner.birthDate,
            ownerCountry: owner.country,
            ownerState: owner.state,
            ownerCity: owner.city,
        };

        const newBikeId = await addBike({
            ...bikeData,
            modality: bikeData.modality as Modality | undefined, // FIXED: Type casting for modality
            userId: session.uid,
            serialNumber,
            ownershipProof: ownershipProofUrl || '',
            registrationIp: ip,
            updatedAt: new Date().toISOString(),
            photos: [
                photoUrl,
                serialNumberPhotoUrl,
                additionalPhoto1Url,
                additionalPhoto2Url,
            ].filter((url): url is string => !!url),
            ...denormalizedData, // INYECTAR DATOS
        });

        // ACTUALIZAR EL GARAJE DEL USUARIO (Desnormalización en colección users)
        if (newBikeId) {
            const userRef = adminDb.collection('users').doc(session.uid);
            await userRef.update({
                ownedBrands: FieldValue.arrayUnion(bikeData.make),
                ...(bikeData.modality ? { ownedModalities: FieldValue.arrayUnion(bikeData.modality) } : {})
            });
        }

        // GAMIFICACIÓN DINÁMICA
        let pointsAwarded = 0;
        if (newBikeId) {
            const pointsResult = await awardPoints(session.uid, 'bike_registration', { bikeId: newBikeId });
            pointsAwarded = pointsResult?.points || 0;
        }

        revalidatePath('/dashboard');
        return { success: true, message: '¡Bicicleta registrada exitosamente!', pointsAwarded };

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
        const errors = validatedFields.error.flatten().fieldErrors;
        console.error("Zod Validation Error:", errors);
        
        // Si falta la foto lateral
        if (errors.photoUrl) {
            return { success: false, message: 'Acción requerida: Para completar el registro de tu bicicleta, debes subir una Foto Lateral.' };
        }

        return {
            success: false,
            message: 'Error de validación. Por favor, revisa que todos los campos obligatorios estén llenos.',
            errors: errors,
        };
    }

    const { id, photoUrl, serialNumberPhotoUrl, additionalPhoto1Url, additionalPhoto2Url, ownershipProofUrl, serialNumber, ...bikeData } = validatedFields.data;
    if (!id) {
        return { success: false, message: "Error: No se encontró el ID de la bicicleta para actualizar." };
    }
    
    // Obtener la bicicleta actual para saber si el ID antiguo era PENDING
    const currentBike = await getBike(session.uid, id);
    if (!currentBike) {
         return { success: false, message: "No tienes permiso para actualizar esta bicicleta." };
    }

    const ip = await getClientIp();

    // 1. VALIDACIÓN LOCAL (Si el serial cambió)
    const isUnique = await isSerialNumberUnique(serialNumber, id);
    if (!isUnique) {
        logFraudAttempt(session.uid, serialNumber, 'local', ip);
        return {
            success: false,
            message: `Error: El número de serie '${serialNumber}' ya se encuentra registrado por otro usuario.`,
            errors: { serialNumber: ["Este número de serie ya está registrado."] },
        };
    }

    // 2. VALIDACIÓN INTERNACIONAL (Solo si el serial es nuevo o cambió y no empieza con PENDING_)
    if (serialNumber !== currentBike.serialNumber && !serialNumber.startsWith('PENDING_')) {
        const isStolenInternationally = await checkBikeIndexForTheft(serialNumber);
        if (isStolenInternationally) {
             logFraudAttempt(session.uid, serialNumber, 'bike_index', ip);
             return {
                success: false,
                message: `Alerta de Seguridad: No podemos registrar este número de serie porque cuenta con un reporte internacional de robo activo en Bike Index.`,
                errors: { serialNumber: ["Reporte de robo internacional detectado."] },
            };
        }
    }

    // 3. ACTUALIZACIÓN EN DB
    try {
        await updateBikeData(id, {
            ...bikeData,
            modality: bikeData.modality as Modality | undefined, // FIXED: Type casting for modality
            serialNumber,
            ownershipProof: ownershipProofUrl || '',
            photos: [
                photoUrl,
                serialNumberPhotoUrl,
                additionalPhoto1Url,
                additionalPhoto2Url,
            ].filter((url): url is string => !!url),
        });

        // ACTUALIZAR EL GARAJE DEL USUARIO (Por si cambió de marca/modalidad)
        const userRef = adminDb.collection('users').doc(session.uid);
        await userRef.update({
            ownedBrands: FieldValue.arrayUnion(bikeData.make),
            ...(bikeData.modality ? { ownedModalities: FieldValue.arrayUnion(bikeData.modality) } : {})
        });

        // RECOMPENSA EXTRA: Si el usuario está cambiando un PENDING_ a un real, le damos puntos adicionales
        if (currentBike.serialNumber.startsWith('PENDING_') && !serialNumber.startsWith('PENDING_')) {
            await awardPoints(session.uid, 'bike_registration', { bikeId: id, method: 'express_completion' });
        }
        
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

        // ACTUALIZAR EL FLAG EN EL USUARIO
        const userRef = adminDb.collection('users').doc(session.uid);
        await userRef.update({ hasStolenBikes: true });

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
                        ownerPhone: ownerPhone,
                        contactProfile: theftData.contactProfile 
                    });
                }
            }
        } catch (notificationError) {
            console.error("Failed to send theft alert notification:", notificationError);
        }

        revalidatePath('/dashboard');
        revalidatePath(`/dashboard/bikes/${bikeId}`);
        revalidatePath('/admin'); 
        return { message: 'El robo ha sido reportado exitosamente.' };
    } catch (error) {
        console.error("Error reporting theft:", error);
        return { message: 'Error de base de datos: No se pudo reportar el robo.' };
    }
}


export async function markAsRecovered(bikeId: string) {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { success: false, error: 'Unauthorized' };
    }
    try {
        await updateBikeData(bikeId, {
            status: 'recovered',
        });

        // GAMIFICACIÓN DINÁMICA
        const pointsResult = await awardPoints(session.uid, 'bike_recovery', { bikeId });

        revalidatePath('/dashboard');
        revalidatePath(`/dashboard/bikes/${bikeId}`);
        revalidatePath('/admin');
        return { success: true, pointsAwarded: pointsResult?.points || 0 };
    } catch (error) {
        console.error("Failed to mark as recovered:", error);
        return { success: false, error: 'Internal Error' };
    }
}

// NUEVA ACCIÓN PARA ADMIN: Marcar bicicleta como compartida socialmente
export async function markBikeAsSharedAction(bikeId: string) {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { success: false, message: 'No estás autenticado.' };
    }

    try {
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
        
        // GAMIFICACIÓN DINÁMICA
        const pointsResult = await awardPoints(session.uid, 'document_verification', { bikeId });

        revalidatePath(`/dashboard/bikes/${bikeId}`);
        return { success: true, pointsAwarded: pointsResult?.points || 0 };
    } catch (error) {
        console.error("Failed to update ownership proof:", error);
        throw new Error("Could not update ownership proof.");
    }
}

export async function transferOwnership(prevState: { error?: string; success?: boolean }, formData: FormData): Promise<{ error?: string; success?: boolean, pointsAwarded?: number }> {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { error: 'Debes iniciar sesión para transferir la propiedad.' };
    }

    const schema = z.object({
        bikeId: z.string(),
        newOwnerEmail: z.string().email('Por favor, introduce un correo electrónico válido.'),
        saleAmount: z.string().optional(), // Nuevo campo para trazabilidad
    });

    const validatedFields = schema.safeParse({
        bikeId: formData.get('bikeId'),
        newOwnerEmail: formData.get('newOwnerEmail'),
        saleAmount: formData.get('saleAmount'),
    });

    if (!validatedFields.success) {
        return { error: 'Datos inválidos. Por favor, revisa el correo electrónico.' };
    }

    const { bikeId, newOwnerEmail, saleAmount } = validatedFields.data;
    const currentUserId = session.uid;

    try {
        const newOwner = await getUserByEmail(newOwnerEmail);
        if (!newOwner) {
            return { error: 'El usuario con ese correo electrónico no fue encontrado en BiciRegistro. Pídele que cree una cuenta para poder transferirle la bicicleta.' };
        }

        if (newOwner.id === currentUserId) {
            return { error: 'No puedes transferirte la bicicleta a ti mismo.' };
        }
        
        const bike = await getBike(currentUserId, bikeId);
        if (!bike) {
            return { error: 'No estás autorizado para transferir esta bicicleta.' };
        }

        const saleValueNum = saleAmount ? parseFloat(saleAmount) : 0;
        const batch = adminDb.batch();

        // 1. ACTUALIZAR EL DOCUMENTO DE LA BICICLETA
        const bikeRef = adminDb.collection('bikes').doc(bikeId);
        batch.update(bikeRef, { 
            userId: newOwner.id,
            status: 'safe', // Cambia de 'inventory' o cualquier otro a 'safe' (Activa)
            appraisedValue: saleValueNum > 0 ? saleValueNum : (bike.appraisedValue || 0), // El precio de venta se vuelve el nuevo MSRP/Valor
            ownerGender: newOwner.gender || undefined, 
            ownerBirthDate: newOwner.birthDate || undefined,
            ownerCountry: newOwner.country || undefined,
            ownerState: newOwner.state || undefined,
            ownerCity: newOwner.city || undefined,
            transferredAt: new Date().toISOString()
        });
        
        // 2. ACTUALIZAR EL GARAJE DEL NUEVO DUEÑO (Filtros cruzados)
        const newOwnerRef = adminDb.collection('users').doc(newOwner.id);
        batch.update(newOwnerRef, {
            ownedBrands: FieldValue.arrayUnion(bike.make),
            ...(bike.modality ? { ownedModalities: FieldValue.arrayUnion(bike.modality) } : {})
        });

        // 3. REGISTRO EN ECOSYSTEM SALES (Trazabilidad)
        if (saleValueNum > 0) {
            const saleRef = adminDb.collection('ecosystem-sales').doc();
            batch.set(saleRef, {
                bikeId,
                sellerId: currentUserId,
                buyerId: newOwner.id,
                saleAmount: saleValueNum,
                make: bike.make,
                model: bike.model,
                date: new Date().toISOString()
            });
        }

        await batch.commit();

        // GAMIFICACIÓN DINÁMICA
        const pointsResult = await awardPoints(currentUserId, 'ownership_transfer', { bikeId, newOwnerId: newOwner.id });

        revalidatePath('/dashboard');
        revalidatePath(`/dashboard/bikes/${bikeId}`);
        
        return { success: true, pointsAwarded: pointsResult?.points || 0 };

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

        const ip = await getClientIp();

        // 1. VALIDACIÓN LOCAL
        const isUnique = await isSerialNumberUnique(formData.serialNumber);
        if (!isUnique) {
            logFraudAttempt(userId, formData.serialNumber, 'local', ip);
            return {
                success: false,
                message: `Error: El número de serie '${formData.serialNumber}' ya se encuentra registrado.`,
            };
        }

        // 2. VALIDACIÓN INTERNACIONAL (BIKE INDEX)
        const isStolenInternationally = await checkBikeIndexForTheft(formData.serialNumber);
        if (isStolenInternationally) {
            logFraudAttempt(userId, formData.serialNumber, 'bike_index', ip);
            return {
                success: false,
                message: `Alerta: No se puede registrar. La bicicleta cuenta con un reporte internacional de robo (Bike Index).`,
            };
        }

        // 3. REGISTRO EXITOSO
        // OBTENER DATOS DEL USUARIO PARA DESNORMALIZACIÓN
        const owner = await getUser(userId);
        if (!owner) throw new Error("Owner not found");

        const denormalizedData = {
            ownerGender: owner.gender,
            ownerBirthDate: owner.birthDate,
            ownerCountry: owner.country,
            ownerState: owner.state,
            ownerCity: owner.city,
        };

        const newBikeId = await addBike({
            userId,
            serialNumber: formData.serialNumber,
            make: formData.brand,
            model: formData.model,
            color: formData.color,
            modality: formData.type as Modality | undefined, // FIXED: Type casting for modality
            modelYear: formData.year,
            appraisedValue: parseFloat(formData.value),
            ownershipProof: '',
            registrationIp: ip,
            updatedAt: new Date().toISOString(), // FIXED: Missing updatedAt
            photos: photoUrls,
            ...denormalizedData, // INYECTAR
        });

        // ACTUALIZAR EL GARAJE DEL USUARIO
        if (newBikeId) {
            const userRef = adminDb.collection('users').doc(userId);
            await userRef.update({
                ownedBrands: FieldValue.arrayUnion(formData.brand),
                ...(formData.type ? { ownedModalities: FieldValue.arrayUnion(formData.type) } : {})
            });
        }

        // GAMIFICACIÓN DINÁMICA
        let pointsAwarded = 0;
        if (newBikeId) {
            const pointsResult = await awardPoints(userId, 'bike_registration', { bikeId: newBikeId, method: 'wizard' });
            pointsAwarded = pointsResult?.points || 0;
        }

        revalidatePath('/dashboard');
        return { success: true, message: '¡Bicicleta registrada exitosamente con Sprock!', pointsAwarded };

    } catch (error: any) {
        console.error("Wizard Registration Error:", error);
        return { success: false, message: error.message || "Error al registrar la bicicleta." };
    }
}

export async function validateSerialNumberAction(serialNumber: string) {
    const session = await getDecodedSession(); // Opcional, pero ideal para el log
    
    // 1. Validación Local Rápida
    const isUnique = await isSerialNumberUnique(serialNumber);
    if (!isUnique) {
        // En este punto no siempre logueamos porque el usuario solo está escribiendo en el input, 
        // pero podemos atraparlo si el frontend lanza el Submit prematuramente.
        return { exists: true, message: "Este número de serie ya está registrado en BiciRegistro." };
    }

    // 2. Validación Externa Asíncrona (Solo si no existe localmente)
    const isStolenInternationally = await checkBikeIndexForTheft(serialNumber);
    if (isStolenInternationally) {
        // Si lo detectamos "en vivo" mientras teclea
        if (session?.uid) {
            const ip = await getClientIp();
            logFraudAttempt(session.uid, serialNumber, 'bike_index', ip);
        }
        return { exists: true, message: "Alerta: Reporte de robo internacional activo (Bike Index)." };
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
