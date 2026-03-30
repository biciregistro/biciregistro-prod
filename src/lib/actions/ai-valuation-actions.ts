'use server';

import { ai } from '@/ai/genkit';
import { getDecodedSession } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/server';
import { getUser, addBike } from '@/lib/data';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { headers } from 'next/headers';
import { getStorage } from 'firebase-admin/storage';
import { awardPoints } from '@/lib/actions/gamification-actions';

export async function valuateBikeAction(brand: string, model: string, year: string) {
    try {
        const prompt = `Actúa como un tasador profesional de bicicletas de segunda mano en México. 
        El usuario proporciona los siguientes datos de una bicicleta:
        Marca: ${brand}
        Modelo: ${model}
        Año: ${year}
        
        Busca en internet el valor actual de mercado de segunda mano (reventa) de esta bicicleta en pesos mexicanos (MXN). 
        Considera la depreciación por el año.
        
        Devuelve ÚNICAMENTE un objeto JSON estricto con el formato {"minPrice": numero, "maxPrice": numero}. 
        El rango debe ser realista, nunca un número exacto. 
        Si el modelo es desconocido, da un rango lógico estimado para esa marca y año.
        No incluyas markdown, ni texto adicional, SOLO el JSON válido.`;

        const response = await ai.generate({
            prompt: prompt,
            // Importante: Genkit por defecto usa Gemini 2.0 flash
            // Podemos configurar búsqueda de Google si el plugin lo soporta, 
            // pero el modelo flash suele tener buen conocimiento.
            config: {
                temperature: 0.2, // Baja temperatura para respuestas consistentes
            }
        });

        if (!response.text) {
            throw new Error("Respuesta vacía de la IA.");
        }

        // Limpiar posible markdown
        const cleanText = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanText);

        if (typeof data.minPrice !== 'number' || typeof data.maxPrice !== 'number') {
            throw new Error("Formato JSON incorrecto devuelto por la IA.");
        }

        return { success: true, minPrice: data.minPrice, maxPrice: data.maxPrice };

    } catch (error: any) {
        console.error("Valuation Error:", error);
        return { success: false, error: "No pudimos calcular el valor en este momento. Intenta más tarde." };
    }
}

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

export async function createExpressBikeAction(payload: any) {
    const session = await getDecodedSession();
    if (!session?.uid) {
        return { success: false, message: 'No estás autenticado. Por favor inicia sesión.' };
    }

    try {
        const userId = session.uid;
        const photoUrls: string[] = [];

        if (payload.bikeImage) {
            const path = `bike-photos/${userId}/${Date.now()}_express.jpg`;
            const url = await uploadBase64Image(payload.bikeImage, path);
            if (url) photoUrls.push(url);
        }

        const ip = await getClientIp();

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

        // Generar serial temporal "zero-regression"
        const temporarySerial = `PENDING_${crypto.randomUUID()}`;

        const parsedValue = parseFloat(payload.value);

        const newBikeId = await addBike({
            userId,
            serialNumber: temporarySerial,
            make: payload.brand,
            model: payload.model,
            color: payload.color,
            modality: payload.type,
            modelYear: payload.year,
            appraisedValue: isNaN(parsedValue) ? 0 : parsedValue,
            ownershipProof: '',
            registrationIp: ip,
            photos: photoUrls,
            ...denormalizedData, // INYECTAR
        });

        // ACTUALIZAR EL GARAJE DEL USUARIO
        if (newBikeId) {
            const userRef = adminDb.collection('users').doc(userId);
            await userRef.update({
                ownedBrands: FieldValue.arrayUnion(payload.brand),
                ...(payload.type ? { ownedModalities: FieldValue.arrayUnion(payload.type) } : {})
            });
        }

        // GAMIFICACIÓN DINÁMICA
        let pointsAwarded = 0;
        if (newBikeId) {
            const pointsResult = await awardPoints(userId, 'bike_registration', { bikeId: newBikeId, method: 'express' });
            pointsAwarded = pointsResult?.points || 0;
        }

        return { success: true, message: '¡Bicicleta registrada exitosamente!', pointsAwarded };

    } catch (error: any) {
        console.error("Express Registration Error:", error);
        return { success: false, message: error.message || "Error al registrar la bicicleta." };
    }
}
