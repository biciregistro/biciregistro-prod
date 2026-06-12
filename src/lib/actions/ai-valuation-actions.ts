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
import { normalizeBrand, normalizeBikeModel } from '@/lib/utils'; // <-- Centralized Logic

const ValuationOutputSchema = z.object({
    actualManufacturer: z.string().describe("PASO 1: IGNORA LA MARCA DEL USUARIO al inicio. Usa tu conocimiento ciclista: ¿Qué empresa (fabricante real) creó el modelo ingresado? (Ej. Si el modelo es 'Fuel EX', el fabricante es 'Trek'). Si el modelo es desconocido, pero suena a bicicleta, usa la marca del usuario."),
    isBrandMatch: z.boolean().describe("PASO 2: ¿La marca seleccionada por el usuario coincide con 'actualManufacturer'? (Si el usuario seleccionó 'Otra', asume que SIEMPRE es TRUE)."),
    status: z.enum(['valid', 'mismatch', 'fake']).describe("PASO 3: Solo usa 'fake' si es claramente un auto, moto u objeto extraño. Si isBrandMatch es TRUE, usa 'valid'. Si isBrandMatch es FALSE, evalúa: si la marca es famosa mundialmente y hay un error evidente (ej. usuario dice Trek pero es una Specialized), usa 'mismatch'. PERO si es una marca local, genérica, departamental o desconocida para ti, asume que el usuario tiene razón y usa 'valid'."),
    message: z.string().describe("PASO 4: Mensaje para el usuario. Si status es 'mismatch', corrige de forma amable: 'Oye, ese modelo parece ser de [actualManufacturer], no de [Marca Usuario].'. Si es 'valid', pon 'Ok'."),
    searchQueryUsed: z.string().describe("Consulta de búsqueda sugerida para repuestos o referencias. Si no es válida, pon 'N/A'."),
    msrpEstimation: z.number().int().describe("Estimación del PRECIO DE LISTA ORIGINAL (Nueva en Tienda) en MXN. Usa el contexto de la comunidad provisto como guía obligatoria, pero aplica tu criterio si el nivel de confianza de la comunidad es bajo."),
    reasoning: z.string().describe("Breve razonamiento. Si es válida, explica la depreciación calculada basada en el año y los componentes (ej. Carbon, E+). Si es inválida, explica el error."),
    minPrice: z.number().int().describe("Valor mínimo de reventa estimado en MXN considerando depreciación y mercado secundario. Cero si no es válida."),
    maxPrice: z.number().int().describe("Valor máximo de reventa estimado en MXN considerando depreciación y mercado secundario. Cero si no es válida.")
});

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function valuateBikeAction(brand: string, model: string, year: string) {
    let retries = 3;
    let backoffTime = 1000;

    // --- FASE 1: BÚSQUEDA EN EL "LIBRO AZUL" (RAG HÍBRIDO) ---
    let blueBookContext = "";

    try {
        const normBrand = normalizeBrand(brand);
        const { id: normModelId } = normalizeBikeModel(model, brand);
        
        if (normModelId !== 'INVALID') {
            const compoundKey = `${normBrand}_${normModelId}_${year}`;
            console.log(`[RAG] Buscando en Libro Azul: ${compoundKey}`);
            
            const bbDoc = await adminDb.collection('blue-book-valuations').doc(compoundKey).get();
            
            if (bbDoc.exists) {
                const bbData = bbDoc.data();
                if (bbData && bbData.stats && bbData.stats.sampleSize >= 1) {
                    
                    const reportedPrice = bbData.stats.averageValue;
                    const confidence = bbData.stats.confidenceLevel || 'LOW';
                    const currentYear = new Date().getFullYear();
                    const bikeYear = parseInt(year, 10) || currentYear;
                    const ageInYears = Math.max(0, currentYear - bikeYear);
                    
                    // En lugar de imponer la depreciación matemática estricta al servidor, 
                    // inyectamos el dato de la comunidad y empoderamos a la IA a auditarlo y depreciarlo.
                    blueBookContext = `
                    DATOS DE MERCADO BICIREGISTRO (RAG HÍBRIDO):
                    Encontramos ${bbData.stats.sampleSize} bicicletas de este modelo exacto (${brand} ${model} ${year}) en la comunidad.
                    El precio de compra/valoración promedio reportado por los usuarios es de $${reportedPrice} MXN.
                    El nivel de confianza estadístico de este dato es: ${confidence}.
                    
                    INSTRUCCIÓN CRÍTICA DE VALUACIÓN Y AUDITORÍA:
                    1. AUDITORÍA MSRP: El dato comunitario ($${reportedPrice} MXN) puede ser el precio que pagaron por la bici nueva, o puede estar ya devaluado si la compraron de segunda mano.
                       Tú debes decidir el "msrpEstimation" (Precio Nueva) real. Si el nivel de confianza es HIGH o MEDIUM, dale mucho peso a este dato. Si es LOW y el precio te parece absurdo para esta gama, utiliza tu conocimiento experto para fijar el MSRP correcto.
                    2. DEPRECIACIÓN DINÁMICA: Aplica tu propio modelo de depreciación sobre el MSRP para llegar al precio de reventa actual (minPrice y maxPrice). 
                       Considera que la bicicleta tiene ${ageInYears} años de antigüedad. Las bicicletas de carbono (CRB, CF) retienen más valor. Las bicicletas eléctricas (E+, Hybrid) se deprecian rápido por la batería.
                    3. MENCIONA EN EL REASONING si utilizaste los datos de la comunidad como base o si tuviste que corregirlos por ser irreales.
                    `;
                    console.log(`[RAG] Contexto inyectado. Precio reportado: $${reportedPrice}. Confianza: ${confidence}`);
                }
            } else {
                 console.log(`[RAG] Sin coincidencias locales. Procediendo a Zero-Shot Valuation.`);
            }
        } else {
             console.log(`[RAG] Modelo detectado como ruidoso o genérico. Saltando RAG local.`);
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
            Eres un Tasador de Bicicletas Experto para la plataforma "BiciRegistro" en México.
            Tu deber principal es ofrecer una cotización de mercado justa en el mercado de reventa de bicicletas usadas, evitando rechazos innecesarios, y utilizando lógica financiera para estimar precios precisos al día de hoy (Año actual: ${currentYear}).

            Datos ingresados por el usuario:
            - Marca seleccionada: "${brand}"
            - Modelo ingresado: "${model}"
            - Año Modelo: ${year} (Antigüedad: ${ageInYears} años)
            - Año de cálculo actual: ${currentYear}

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

            REGLA DE TOLERANCIA Y JERARQUÍA PARA MARCAS LOCALES O DESCONOCIDAS (MUY IMPORTANTE):
            El mercado mexicano tiene cientas de marcas locales, departamentales o de importación directa (ej. Monk, Zigna, Veloci, Mercurio, Turbo, Gospel, Alubike, Benotto, Magistroni, etc.).
            Si no reconoces el modelo con total certeza, CONFÍA EN EL USUARIO. 
            No uses 'mismatch' por desconocimiento. Asume isBrandMatch = TRUE y status = 'valid'. 
            OJO: NUNCA asumas que todas valen lo mismo ni que todas son "gama de entrada". DEBES analizar el texto del "${model}" para detectar la jerarquía:
            - Variantes numéricas: Un sufijo "3.0", "4.0" o "SL 7" siempre representa componentes superiores y un precio drásticamente mayor que un "1.0", "2.0" o "SL 5" de la misma familia.
            - Componentes y materiales: Palabras como "Carbon", "Comp", "Pro", "AXS", "E+" indican gamas medias-altas o altas, multiplicando el valor. 
            
            TABLA DE PRECIOS BASE (MSRP NUEVAS) PARA MARCA "ALUBIKE" (Válida 2024-2026):
            - XTA DS (Doble Suspensión): $28,490 - $33,000 MXN
            - XTA 3.0: $25,999 MXN
            - Onix 700C: $23,899 MXN
            - XTA 2.0: $17,849 - $19,200 MXN
            - Kodiak 29: $12,800 - $15,800 MXN
            - XTA 1.0: $14,699 MXN
            - Sierra 29" o 27.5": $10,499 - $10,999 MXN
            - Slite SLT / DF 29: $8,699 - $8,999 MXN
            - Sierra (Infantil 20"/24"): $5,790 - $7,800 MXN
            *Si el modelo consultado coincide o se parece a alguno de esta tabla, utiliza estos precios exactos como tu 'msrpEstimation'.

            METODOLOGÍA DE VALUACIÓN Y ACTUALIZACIÓN AL AÑO ACTUAL (${currentYear}):
            Para calcular el precio, sigue internamente esta lógica:
            1. Basado en la marca, el modelo y la jerarquía (sufijos/versión), estima el Precio de Lista Original (MSRP) en pesos mexicanos (MXN) que tenía la bicicleta en su año de lanzamiento (${year}).
            2. Si tu base de conocimiento está desactualizada, ajusta ese MSRP original proyectando la inflación acumulada hasta el año actual (${currentYear}).
            3. Aplica una depreciación lógica: Las bicicletas pierden aprox. 25-30% de su valor al salir de tienda, y un 5-8% adicional por cada año de antigüedad (${ageInYears}).

            ${blueBookContext}

            INSTRUCCIÓN FINAL DE CONCILIACIÓN:
            Si el bloque anterior ("DATOS DE MERCADO BICIREGISTRO") existe y su nivel de confianza es MEDIUM o HIGH, el valor de la comunidad TIENE PRIORIDAD sobre tu estimación teórica del MSRP. Usa tu metodología heurística (Paso 1, 2, 3) ÚNICAMENTE como mecanismo de auditoría o si los datos de la comunidad son inexistentes (LOW/Vacíos).
            `;

            const response = await ai.generate({
                model: 'googleai/gemini-3.1-flash-lite', // Cambiado a Gemini 3.1 Flash Lite por velocidad
                prompt: prompt,
                output: { schema: ValuationOutputSchema },
                config: {
                    temperature: 0.2, // Ligero aumento para permitir que la IA audite mejor si es necesario
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

            // Sanitización absoluta
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
                maxPrice: finalMax,
                msrp: valuationData.msrpEstimation,
                reasoning: valuationData.reasoning
            };

        } catch (error: any) {
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
            
            // GAMIFICACIÓN DINÁMICA: Solo otorga puntos si el serial es válido (No aplicable a PENDING)
            let pointsAwarded = 0;
            if (!temporarySerial.startsWith('PENDING_')) {
                const pointsResult = await awardPoints(userId, 'bike_registration', { bikeId: newBikeId, method: 'express' });
                pointsAwarded = pointsResult?.points || 0;
            }
            
            return { success: true, message: '¡Bicicleta registrada!', pointsAwarded };
        }
        return { success: false, message: "Error al registrar." };

    } catch (error: any) {
        console.error("Express Registration Error:", error);
        return { success: false, message: error.message };
    }
}
