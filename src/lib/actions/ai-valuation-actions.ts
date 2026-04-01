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
    searchQueryUsed: z.string().describe("La consulta de búsqueda exacta que usarías en Google para encontrar el precio (ej. 'Precio bicicleta usada Giant Talon 3 2022 México')."),
    msrpEstimation: z.number().int().describe("Estimación del precio de lista original (nueva) en MXN, basándote en la marca, el modelo exacto y su gama."),
    reasoning: z.string().describe("Breve razonamiento: Describe cómo interpretaste el sub-modelo o los apellidos de la bicicleta (ej. Alloy, Carbon, 3, S-Works), y justifica la depreciación aplicada para llegar al valor de reventa en México."),
    minPrice: z.number().int().describe("Valor mínimo de reventa estimado en MXN (estado de conservación: Bueno, componentes originales con desgaste normal)."),
    maxPrice: z.number().int().describe("Valor máximo de reventa estimado en MXN (estado de conservación: Casi Nuevo o Excelente, sin detalles).")
});

export async function valuateBikeAction(brand: string, model: string, year: string) {
    try {
        const currentYear = new Date().getFullYear();
        const bikeYear = parseInt(year, 10) || currentYear;
        const ageInYears = Math.max(0, currentYear - bikeYear);

        // Prompt de nivel "Tasador Experto" enfocado en especificidad de sub-modelos
        const prompt = `
        Eres un Tasador Experto de Bicicletas de Segunda Mano en el mercado de México. 
        Tu objetivo es calcular el rango de valor comercial justo (reventa) de esta bicicleta específica:
        
        - Marca: ${brand}
        - Modelo Exacto: ${model}
        - Año Modelo: ${year} (Antigüedad: ${ageInYears} años)

        INSTRUCCIONES CRÍTICAS DE PRECISIÓN (LEE CON ATENCIÓN):
        1. ANALIZA EL SUB-MODELO: Las bicicletas tienen "apellidos" que cambian drásticamente el precio. Una "Specialized Stumpjumper Alloy" no cuesta lo mismo que una "S-Works", y una "Giant Talon 3" es mucho más económica que una "Talon 1". 
           - Presta extrema atención a las palabras en el campo "Modelo Exacto" (números de versión, materiales como Carbon/Advanced, o grupos como AXS/Deore).
        2. CONTEXTO DE MERCADO: Piensa en el precio de esta bicicleta específica buscando en plataformas como MercadoLibre México o grupos de Facebook de ciclismo.
        3. CÁLCULO DE DEPRECIACIÓN:
           - Estima primero el Precio Original de Lista (MSRP) cuando era nueva, convertido a Pesos Mexicanos (MXN).
           - Aplica la depreciación del mercado: Usualmente -25% el primer año, y -10% por cada año adicional. Ajusta esto si sabes que el modelo es muy buscado (retiene valor) o poco deseado (deprecia más rápido).
           - El piso máximo de depreciación es del 75%.
        4. RANGO FINAL: Calcula un rango de reventa realista en MXN. El 'minPrice' es para un estado usado pero funcional, y el 'maxPrice' es para un estado impecable (semonuevo).
        
        REGLAS:
        - Todo debe estar en MXN (Pesos Mexicanos). 
        - No uses decimales, redondea a miles o cientos cerrados (ej. 15500, no 15482).
        `;

        const response = await ai.generate({
            prompt: prompt,
            output: { schema: ValuationOutputSchema },
            config: {
                temperature: 0.15, // Ligeramente mayor a 0 para permitirle "pensar" en las variaciones del modelo, pero manteniéndose matemático.
                topK: 10,
            }
        });

        const valuationData = response.output;

        if (!valuationData || typeof valuationData.minPrice !== 'number' || typeof valuationData.maxPrice !== 'number') {
            throw new Error("El modelo no devolvió el formato esperado.");
        }

        // Sanitización final para evitar rangos ilógicos o invertidos
        let finalMin = Math.max(1000, valuationData.minPrice);
        let finalMax = Math.max(finalMin + 500, valuationData.maxPrice);

        // Logs para auditoría de precisión en la terminal (ayuda a depurar si las cotizaciones están fallando)
        console.log(`[AI VALUATION] Consulta: ${brand} ${model} ${year}`);
        console.log(`[AI VALUATION] Búsqueda Interna Sugerida: ${valuationData.searchQueryUsed}`);
        console.log(`[AI VALUATION] MSRP Estimado Nuevo: $${valuationData.msrpEstimation} MXN`);
        console.log(`[AI VALUATION] Razonamiento:`, valuationData.reasoning);
        console.log(`[AI VALUATION] Rango Final: $${finalMin} - $${finalMax} MXN`);

        return { 
            success: true, 
            minPrice: finalMin, 
            maxPrice: finalMax 
        };

    } catch (error: any) {
        console.error("Valuation Error:", error);
        // Fallback robusto en caso de que la API falle
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
