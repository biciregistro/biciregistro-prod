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
    actualManufacturer: z.string().describe("PASO 1: IGNORA LA MARCA DEL USUARIO al inicio. Usa tu conocimiento ciclista: ¿Qué empresa (fabricante real) creó el modelo ingresado? (Ej. Si el modelo es 'Fuel EX', el fabricante es 'Trek'). Si el modelo es desconocido, pero suena a bicicleta, usa la marca del usuario."),
    isBrandMatch: z.boolean().describe("PASO 2: ¿La marca seleccionada por el usuario coincide con 'actualManufacturer'? (Si el usuario seleccionó 'Otra', asume que SIEMPRE es TRUE)."),
    status: z.enum(['valid', 'mismatch', 'fake']).describe("PASO 3: Solo usa 'fake' si es claramente un auto, moto u objeto extraño. Si isBrandMatch es TRUE, usa 'valid'. Si isBrandMatch es FALSE, evalúa: si la marca es famosa mundialmente y hay un error evidente (ej. usuario dice Trek pero es una Specialized), usa 'mismatch'. PERO si es una marca local, genérica, departamental o desconocida para ti, asume que el usuario tiene razón y usa 'valid'."),
    message: z.string().describe("PASO 4: Mensaje para el usuario. Si status es 'mismatch', corrige de forma amable: 'Oye, ese modelo parece ser de [actualManufacturer], no de [Marca Usuario].'. Si es 'valid', pon 'Ok'."),
    searchQueryUsed: z.string().describe("Consulta de búsqueda sugerida para repuestos o referencias. Si no es válida, pon 'N/A'."),
    msrpEstimation: z.number().int().describe("Estimación del precio de lista original (nueva) en MXN. Si es una marca genérica, asume un precio base económico."),
    reasoning: z.string().describe("Breve razonamiento. Si es válida, explica la depreciación. Si es inválida, explica el error."),
    minPrice: z.number().int().describe("Valor mínimo de reventa estimado en MXN. Cero si no es válida."),
    maxPrice: z.number().int().describe("Valor máximo de reventa estimado en MXN. Cero si no es válida.")
});

// Helper para normalizar búsquedas en el Libro Azul
const normalizeTextForBlueBook = (text: string | undefined): string => {
    if (!text) return 'UNKNOWN';
    return text.toLowerCase().replace(/[^a-z0-9]/g, '');
};

// Nuevo Helper con Jitter
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function valuateBikeAction(brand: string, model: string, year: string) {
    let retries = 3;
    let backoffTime = 1000; // Inicia con 1 segundo

    // --- FASE 1: BÚSQUEDA EN EL "LIBRO AZUL" (RAG) ---
    let blueBookContext = "";
    let isRAG = false;
    let blueBookMin = 0;
    let blueBookMax = 0;

    try {
        const normBrand = normalizeTextForBlueBook(brand);
        const normModel = normalizeTextForBlueBook(model);
        const compoundKey = `${normBrand}_${normModel}_${year}`;
        
        console.log(`[RAG] Buscando en Libro Azul: ${compoundKey}`);
        const bbDoc = await adminDb.collection('blue-book-valuations').doc(compoundKey).get();
        
        if (bbDoc.exists) {
            const bbData = bbDoc.data();
            if (bbData && bbData.stats && bbData.stats.sampleSize >= 2) {
                
                // --- CÁLCULO MATEMÁTICO DE DEPRECIACIÓN DETERMINISTA ---
                const currentYear = new Date().getFullYear();
                const bikeYear = parseInt(year, 10) || currentYear;
                const ageInYears = Math.max(0, currentYear - bikeYear);
                
                let depreciationFactor = 1.0;
                // Fórmula: -25% el primer año, -10% subsecuentes, tope de retención 25% (pérdida máx 75%)
                if (ageInYears === 1) depreciationFactor = 0.75;
                else if (ageInYears >= 2) depreciationFactor = Math.max(0.25, 0.75 - (0.10 * (ageInYears - 1)));

                const originalAverage = bbData.stats.averageValue;
                const originalMin = bbData.stats.minValue;
                const originalMax = bbData.stats.maxValue;

                isRAG = true;
                // Depreciamos los rangos para el mercado de reventa actual
                blueBookMin = Math.round(originalMin * depreciationFactor);
                blueBookMax = Math.round(originalMax * depreciationFactor);
                const depreciatedAverage = Math.round(originalAverage * depreciationFactor);
                
                blueBookContext = `
                DATOS EXTREMADAMENTE IMPORTANTES (LIBRO AZUL DE BICIREGISTRO):
                Tenemos ${bbData.stats.sampleSize} bicicletas de este modelo exacto (${brand} ${model} ${year}) registradas.
                Los usuarios reportaron un precio de compra original promedio de $${originalAverage} MXN.
                Aplicando la depreciación algorítmica por ${ageInYears} años de antigüedad (factor: ${depreciationFactor}), el mercado real dicta que:
                - Rango Real de Reventa Actual: De $${blueBookMin} a $${blueBookMax} MXN.
                
                INSTRUCCIÓN CRÍTICA:
                Debes usar ESTOS VALORES DE REVENTA ACTUAL ($${blueBookMin} a $${blueBookMax}) para 'minPrice' y 'maxPrice'.
                En 'msrpEstimation' usa el valor original de $${originalAverage}.
                En el 'reasoning', MENCIONA EXPLÍCITAMENTE al usuario que tu valuación está respaldada por los registros reales de la comunidad y explica brevemente la depreciación por los ${ageInYears} años.
                `;
                console.log(`[RAG] ¡Éxito! Contexto inyectado. MSRP: $${originalAverage}. Reventa Calc: $${depreciatedAverage}`);
            }
        }
    } catch (e) {
        console.error("[RAG] Error buscando en el Libro Azul:", e);
    }

    // --- FASE 2: LLAMADA A LA IA ---
    while (retries > 0) {
        try {
            const currentYear = new Date().getFullYear();
            const bikeYear = parseInt(year, 10) || currentYear;
            const ageInYears = Math.max(0, currentYear - bikeYear);

            const prompt = `
            Eres un Tasador de Bicicletas Inteligente y Comprensivo para la plataforma "BiciRegistro" en México.
            Tu deber principal es ofrecer una cotización de mercado justa, evitando rechazos innecesarios.

            Datos ingresados por el usuario:
            - Marca seleccionada: "${brand}"
            - Modelo ingresado: "${model}"
            - Año Modelo: ${year} (Antigüedad: ${ageInYears} años)

            TABLA DE VERDADES ABSOLUTAS (SOLO APLICA PARA MARCAS PREMIUM GLOBALES):
            - Los modelos "Talon" son fabricados EXCLUSIVAMENTE por "Giant".
            - Los modelos "Marlin" son fabricados EXCLUSIVAMENTE por "Trek".
            - Los modelos "Rockhopper", "Stumpjumper", "Epic" son de "Specialized".
            - Los modelos "XTC", "Trance", "Anthem" son de "Giant".
            - Los modelos "Fuel EX", "Supercaliber", "Procaliber", "Slash" son de "Trek".
            Si el usuario ingresa un modelo de esta lista bajo una marca equivocada (ej. Marca: Alubike, Modelo: Marlin), DEBES usar 'mismatch'.

            REGLA DE EXCEPCIÓN "OTRA":
            Si la marca seleccionada es la palabra exacta "Otra", "Otras" o similar, NO HAY CONFLICTO DE MARCA. 
            El usuario sabe que su marca no está en el catálogo.
            Acción Obligatoria: isBrandMatch = TRUE y status = 'valid'. El 'actualManufacturer' debe ser la marca que dedujiste a partir del modelo.

            REGLA DE TOLERANCIA PARA MARCAS LOCALES O DESCONOCIDAS:
            El mercado mexicano tiene cientas de marcas locales, departamentales o de importación directa (ej. Monk, Zigna, Veloci, Mercurio, Turbo, Gospel, Alubike, Benotto, Magistroni, etc.).
            Si no reconoces el modelo con total certeza, CONFÍA EN EL USUARIO. 
            No uses 'mismatch' por desconocimiento. Asume isBrandMatch = TRUE y status = 'valid'. 
            Procede a estimar el valor basándote en que probablemente sea una bicicleta de gama de entrada/media.

            ${blueBookContext}

            VALUACIÓN (SÓLO SI ES 'valid'):
            - Estima el MSRP original en MXN.
            - Aplica depreciación (-25% año 1, -10% subsecuentes, tope 75%).
            - Calcula rango en MXN (minPrice y maxPrice) sin decimales.
            `;

            // DIAGNÓSTICO DEL ARQUITECTO
            console.log("🔍 REVISIÓN DE ENTORNO:", {
                tieneGeminiKey: !!process.env.GEMINI_API_KEY,
                tieneGoogleGenaiKey: !!process.env.GOOGLE_GENAI_API_KEY,
                terminacionGemini: process.env.GEMINI_API_KEY?.slice(-4),
                terminacionGoogleGenai: process.env.GOOGLE_GENAI_API_KEY?.slice(-4)
            });

            const response = await ai.generate({
                model: 'googleai/gemini-3.1-flash-lite',
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
            if (valuationData.status === 'fake' || valuationData.status === 'mismatch' || (!valuationData.isBrandMatch && brand.toLowerCase() !== 'otra')) {
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
            let finalMin = valuationData.minPrice || 1000;
            let finalMax = valuationData.maxPrice || 1500;
            
            // Si usamos RAG, aseguramos que la IA no se haya desviado locamente de la realidad
            if (isRAG && blueBookMin > 0 && blueBookMax > 0) {
                // Permitimos un 15% de desviación de la IA respecto al libro azul
                const minAllowed = blueBookMin * 0.85;
                const maxAllowed = blueBookMax * 1.15;
                
                if (finalMin < minAllowed || finalMax > maxAllowed) {
                    console.log(`[RAG CORRECTION] Ajustando la alucinación de la IA a los valores depreciados del Libro Azul.`);
                    finalMin = blueBookMin;
                    finalMax = blueBookMax;
                }
            }

            // Sanitización absoluta
            finalMin = Math.max(1000, finalMin);
            finalMax = Math.max(finalMin + 500, finalMax);

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
            // Detección robusta del error 429 de Genkit/Google
            const isRateLimit = error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED' || error.code === 429;
            
            if (isRateLimit && retries > 1) {
                const jitter = Math.floor(Math.random() * 700);
                const finalDelay = backoffTime + jitter;
                console.warn(`[AI VALUATION] Límite de cuota excedido (429). Reintentando en ${finalDelay}ms...`);
                await delay(finalDelay);
                retries--;
                backoffTime *= 2; 
                continue;
            }
            console.error("Valuation Error:", error);
            return { success: false, isInvalidInput: false, message: "No pudimos conectar con Sprock IA en este momento." };
        }
    }
    
    return { success: false, isInvalidInput: false, message: "Demasiada demanda en los servidores de IA." };
}

// Helper interno para subir imagen Base64 y obtener URL PÚBLICA con Token
async function uploadBase64Image(base64String: string, path: string) {
    try {
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) {
            console.error("Storage Bucket not configured");
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
                metadata: { firebaseStorageDownloadTokens: token }
            },
        });
        const encodedPath = encodeURIComponent(path);
        return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
    } catch (error) {
        console.error("Upload Error:", error);
        return null;
    }
}

// Helper para obtener IP
async function getClientIp(): Promise<string | undefined> {
    const headerList = await headers();
    const forwardedFor = headerList.get('x-forwarded-for');
    if (forwardedFor) return forwardedFor.split(',')[0].trim();
    return undefined;
}

export async function createExpressBikeAction(payload: any) {
    const session = await getDecodedSession();
    if (!session?.uid) return { success: false, message: 'Inicia sesión.' };

    try {
        const userId = session.uid;
        const photoUrls: string[] = [];
        if (payload.bikeImage) {
            const path = `bike-photos/${userId}/${Date.now()}_express.jpg`;
            const url = await uploadBase64Image(payload.bikeImage, path);
            if (url) photoUrls.push(url);
        }
        const ip = await getClientIp();
        const owner = await getUser(userId);
        if (!owner) throw new Error("Owner not found");

        const denormalizedData = {
            ownerGender: owner.gender,
            ownerBirthDate: owner.birthDate,
            ownerCountry: owner.country,
            ownerState: owner.state,
            ownerCity: owner.city,
        };

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
            ...denormalizedData,
        });

        if (newBikeId) {
            const userRef = adminDb.collection('users').doc(userId);
            await userRef.update({
                ownedBrands: FieldValue.arrayUnion(payload.brand),
                ...(payload.type ? { ownedModalities: FieldValue.arrayUnion(payload.type) } : {})
            });
            const pointsResult = await awardPoints(userId, 'bike_registration', { bikeId: newBikeId, method: 'express' });
            return { success: true, message: '¡Bicicleta registrada!', pointsAwarded: pointsResult?.points || 0 };
        }
        return { success: false, message: "Error al registrar." };

    } catch (error: any) {
        console.error("Express Registration Error:", error);
        return { success: false, message: error.message };
    }
}
