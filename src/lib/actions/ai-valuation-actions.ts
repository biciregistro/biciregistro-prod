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
import { z } from 'zod';

const ValuationOutputSchema = z.object({
    actualManufacturer: z.string().describe("PASO 1: IGNORA LA MARCA DEL USUARIO. Usa tu conocimiento ciclista: ¿Qué empresa (fabricante real en la vida real) creó el modelo ingresado? (Ej. Si el modelo es 'Fuel EX', el fabricante real es SÓLO 'Trek')."),
    isBrandMatch: z.boolean().describe("PASO 2: ¿La marca seleccionada por el usuario es la misma que 'actualManufacturer'? (True/False)"),
    status: z.enum(['valid', 'mismatch', 'fake']).describe("PASO 3: Si isBrandMatch es FALSE, OBLIGATORIAMENTE debes elegir 'mismatch'. Si el modelo es un objeto que no es bici, elige 'fake'. Solo si isBrandMatch es TRUE, elige 'valid'."),
    message: z.string().describe("PASO 4: Mensaje para el usuario. Si es 'mismatch', usa 'actualManufacturer' para corregirlo: 'Oye, ese modelo es de [actualManufacturer], no de [Marca Usuario].'. Si es 'valid', pon 'Ok'."),
    searchQueryUsed: z.string().describe("Consulta de búsqueda sugerida. Si no es válida, pon 'N/A'."),
    msrpEstimation: z.number().int().describe("Estimación del precio de lista original (nueva) en MXN. Cero si no es válida."),
    reasoning: z.string().describe("Breve razonamiento. Si es válida, explica la depreciación. Si es inválida, explica el error."),
    minPrice: z.number().int().describe("Valor mínimo de reventa estimado en MXN. Cero si no es válida."),
    maxPrice: z.number().int().describe("Valor máximo de reventa estimado en MXN. Cero si no es válida.")
});

export async function valuateBikeAction(brand: string, model: string, year: string) {
    try {
        const currentYear = new Date().getFullYear();
        const bikeYear = parseInt(year, 10) || currentYear;
        const ageInYears = Math.max(0, currentYear - bikeYear);

        const prompt = `
        Eres un AUDITOR DE DATOS ESTRICTO y Tasador de Bicicletas para la plataforma "BiciRegistro" en México. 
        Tu primer y más importante deber es verificar que los datos ingresados por el usuario no sean un error, un engaño, o una combinación falsa. ASUME SIEMPRE que el usuario se ha equivocado de marca y DEBES refutarlo si es así.
        
        Datos ingresados por el usuario:
        - Marca seleccionada: ${brand}
        - Modelo ingresado: ${model}
        - Año Modelo: ${year} (Antigüedad: ${ageInYears} años)

        TABLA DE VERDADES ABSOLUTAS (PROHIBIDO CONTRADECIR):
        - Los modelos "Talon" (ej. Talon 1, Talon 2, Talon 3, Talon 4) son fabricados EXCLUSIVAMENTE por "Giant". NUNCA por Trek, Specialized o Merida.
        - Los modelos "Marlin" (ej. Marlin 4, Marlin 5, Marlin 6, Marlin 7, Marlin 8) son fabricados EXCLUSIVAMENTE por "Trek". NUNCA por Giant o Specialized.
        - Los modelos "Rockhopper", "Stumpjumper", "Epic", "Chisel" son fabricados EXCLUSIVAMENTE por "Specialized".
        - Los modelos "XTC", "Trance", "Anthem", "Fathom" son fabricados EXCLUSIVAMENTE por "Giant".
        - Los modelos "Fuel EX", "Supercaliber", "Procaliber", "Roscoe", "Slash" son fabricados EXCLUSIVAMENTE por "Trek".

        PROCESO OBLIGATORIO:
        1. Aísla el Modelo: "${model}".
        2. Revisa la TABLA DE VERDADES ABSOLUTAS y tu propio conocimiento interno. ¿Quién fabrica realmente la "${model}" en la vida real? Llénalo en 'actualManufacturer'.
        3. Compara: ¿La marca real es igual a la marca del usuario ("${brand}")? Llénalo en 'isBrandMatch'. (Si el usuario puso Trek y el modelo es Talon 3, la marca real es Giant, por ende isBrandMatch DEBE SER FALSE).
        4. Si no coinciden, aborta la valuación. Tu 'status' debe ser 'mismatch'.

        VALUACIÓN (SÓLO SI ES 'valid'):
        - Estima el MSRP original en MXN.
        - Aplica depreciación (-25% año 1, -10% subsecuentes, tope 75%).
        - Calcula rango en MXN (minPrice y maxPrice) sin decimales.
        `;

        const response = await ai.generate({
            prompt: prompt,
            output: { schema: ValuationOutputSchema },
            config: {
                temperature: 0.0, // Temperatura 0 para asegurar determinismo.
                topK: 1,
            }
        });

        const valuationData = response.output;

        if (!valuationData || !valuationData.status) {
            throw new Error("El modelo no devolvió el formato esperado.");
        }

        // Interceptamos los rechazos
        if (valuationData.status === 'fake' || valuationData.status === 'mismatch' || !valuationData.isBrandMatch) {
            console.log(`[AI VALUATION REJECTED] Marca Usuario: ${brand}, Modelo: ${model}`);
            console.log(`[AI VALUATION REJECTED] Fabricante Real Detectado: ${valuationData.actualManufacturer}`);
            console.log(`[AI VALUATION REJECTED] Motivo: ${valuationData.status}, Mensaje: ${valuationData.message}`);
            return {
                success: false,
                isInvalidInput: true,
                message: valuationData.message || `Ese modelo parece pertenecer a ${valuationData.actualManufacturer}, no a ${brand}. Por favor verifícalo.`
            };
        }

        // Sanitización final para casos válidos
        let finalMin = Math.max(1000, valuationData.minPrice || 1000);
        let finalMax = Math.max(finalMin + 500, valuationData.maxPrice || 1500);

        console.log(`[AI VALUATION SUCCESS] ${brand} ${model} ${year}`);
        console.log(`[AI VALUATION] Fabricante Confirmado:`, valuationData.actualManufacturer);
        console.log(`[AI VALUATION] MSRP Estimado: $${valuationData.msrpEstimation} MXN`);
        console.log(`[AI VALUATION] Razonamiento:`, valuationData.reasoning);
        console.log(`[AI VALUATION] Rango Final: $${finalMin} - $${finalMax} MXN`);

        return { 
            success: true, 
            minPrice: finalMin, 
            maxPrice: finalMax 
        };

    } catch (error: any) {
        console.error("Valuation Error:", error);
        return { success: false, isInvalidInput: false, message: "No pudimos conectar con Sprock IA en este momento. Revisa tu conexión a internet o intenta más tarde." };
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
