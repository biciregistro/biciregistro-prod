'use server';

import { getDecodedSession } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/server';
import { BIKE_RANGES } from '@/lib/constants/bike-ranges';
import { normalizeBrand, normalizeBikeModel } from '@/lib/utils'; // <-- Usando la función centralizada

export async function runAnalyticsDenormalizationMigration(isDryRun: boolean = true) {
    const session = await getDecodedSession();
    
    // 1. Verificación básica de sesión
    if (!session?.uid) {
        console.warn('[Migration] Rechazado: Usuario no autenticado.');
        return { success: false, message: 'No autorizado: Debes iniciar sesión.' };
    }

    const db = adminDb;

    try {
        // 2. Verificación profunda de Rol en Firestore (Solución al Bug 403)
        const userDoc = await db.collection('users').doc(session.uid).get();
        if (!userDoc.exists) {
            console.warn(`[Migration] Rechazado: Usuario ${session.uid} no existe en Firestore.`);
            return { success: false, message: 'No autorizado: Perfil no encontrado.' };
        }

        const userDataFromDb = userDoc.data();
        if (userDataFromDb?.role !== 'admin') {
            console.warn(`[Migration] Rechazado: Usuario ${session.uid} intentó migrar pero su rol es '${userDataFromDb?.role}'.`);
            return { success: false, message: 'No autorizado: Solo administradores pueden ejecutar migraciones.' };
        }

        console.log(`[Migration] Acceso Autorizado para Admin: ${session.uid}. Iniciando migración (DryRun: ${isDryRun})...`);

        const usersRef = db.collection('users');
        const bikesRef = db.collection('bikes');

        const bikesSnapshot = await bikesRef.get();
        if (bikesSnapshot.empty) {
            return { success: true, message: 'No hay bicicletas para migrar.' };
        }

        const userCache = new Map<string, any>();
        let processedBikes = 0;
        let modifiedBikes = 0;
        let userGaragesUpdated = 0;
        let batch = db.batch();
        let batchCount = 0;

        for (const bikeDoc of bikesSnapshot.docs) {
            const bikeData = bikeDoc.data();
            const userId = bikeData.userId;
            processedBikes++;

            if (!userId) continue;

            let userData = userCache.get(userId);
            if (!userData) {
                const fetchedUserDoc = await usersRef.doc(userId).get();
                if (fetchedUserDoc.exists) {
                    userData = fetchedUserDoc.data();
                    userCache.set(userId, userData);
                } else {
                    continue;
                }
            }

            let needsBikeUpdate = false;
            const updatePayload: any = {};

            if (bikeData.ownerGender !== userData.gender) { updatePayload.ownerGender = userData.gender || null; needsBikeUpdate = true; }
            if (bikeData.ownerBirthDate !== userData.birthDate) { updatePayload.ownerBirthDate = userData.birthDate || null; needsBikeUpdate = true; }
            if (bikeData.ownerCountry !== userData.country) { updatePayload.ownerCountry = userData.country || null; needsBikeUpdate = true; }
            if (bikeData.ownerState !== userData.state) { updatePayload.ownerState = userData.state || null; needsBikeUpdate = true; }
            if (bikeData.ownerCity !== userData.city) { updatePayload.ownerCity = userData.city || null; needsBikeUpdate = true; }

            // Lógica para priceRange y modelYearBucket (NUEVO)
            if (typeof bikeData.appraisedValue === 'number' && bikeData.appraisedValue > 0) {
                const value = bikeData.appraisedValue;
                let range = 'unknown';
                if (value < 15000) range = 'entry';
                else if (value < 45000) range = 'mid';
                else if (value < 95000) range = 'mid_high';
                else if (value < 200000) range = 'high';
                else range = 'superbike';

                if (range !== 'unknown' && bikeData.priceRange !== range) {
                    updatePayload.priceRange = range;
                    needsBikeUpdate = true;
                }
            }

            if (bikeData.modelYear) {
                const year = parseInt(bikeData.modelYear, 10);
                const currentYear = new Date().getFullYear();
                let yearBucket: string | null = null;
                
                if (!isNaN(year) && year >= 1900 && year <= currentYear + 1) {
                    if (year <= 1990) {
                        yearBucket = "≤ 1990";
                    } else {
                        const bucketUpperLimit = Math.ceil(year / 5) * 5;
                        const bucketLowerLimit = bucketUpperLimit - 4;
                        yearBucket = `${bucketLowerLimit} - ${bucketUpperLimit}`;
                    }
                }

                if (yearBucket && bikeData.modelYearBucket !== yearBucket) {
                    updatePayload.modelYearBucket = yearBucket;
                    needsBikeUpdate = true;
                }
            }

            if (needsBikeUpdate) {
                if (!isDryRun) {
                    batch.update(bikeDoc.ref, updatePayload);
                    batchCount++;
                }
                modifiedBikes++;
            }

            const ownedBrands = new Set(userData.ownedBrands || []);
            const ownedModalities = new Set(userData.ownedModalities || []);
            const ownedPriceRanges = new Set(userData.ownedPriceRanges || []); // NUEVO
            const ownedModelYears = new Set(userData.ownedModelYears || []);   // NUEVO
            let hasStolenBikes = userData.hasStolenBikes || false;
            let needsUserUpdate = false;

            if (bikeData.make && !ownedBrands.has(bikeData.make)) {
                ownedBrands.add(bikeData.make);
                needsUserUpdate = true;
            }
            if (bikeData.modality && !ownedModalities.has(bikeData.modality)) {
                ownedModalities.add(bikeData.modality);
                needsUserUpdate = true;
            }
            if (bikeData.status === 'stolen' && !hasStolenBikes) {
                hasStolenBikes = true;
                needsUserUpdate = true;
            }

            // Actualizar usuario con rangos y años
            const newRange = updatePayload.priceRange || bikeData.priceRange;
            if (newRange && newRange !== 'unknown' && !ownedPriceRanges.has(newRange)) {
                ownedPriceRanges.add(newRange);
                needsUserUpdate = true;
            }
            
            const newBucket = updatePayload.modelYearBucket || bikeData.modelYearBucket;
            if (newBucket && !ownedModelYears.has(newBucket)) {
                ownedModelYears.add(newBucket);
                needsUserUpdate = true;
            }

            if (needsUserUpdate) {
                userData.ownedBrands = Array.from(ownedBrands);
                userData.ownedModalities = Array.from(ownedModalities);
                userData.ownedPriceRanges = Array.from(ownedPriceRanges); // NUEVO
                userData.ownedModelYears = Array.from(ownedModelYears);   // NUEVO
                userData.hasStolenBikes = hasStolenBikes;
                userCache.set(userId, userData); 
                
                if (!isDryRun) {
                    batch.update(usersRef.doc(userId), {
                        ownedBrands: userData.ownedBrands,
                        ownedModalities: userData.ownedModalities,
                        ownedPriceRanges: userData.ownedPriceRanges, // NUEVO
                        ownedModelYears: userData.ownedModelYears,   // NUEVO
                        hasStolenBikes: userData.hasStolenBikes
                    });
                    batchCount++;
                }
                userGaragesUpdated++;
            }

            if (batchCount >= 450 && !isDryRun) {
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
            }
        }

        if (batchCount > 0 && !isDryRun) {
            await batch.commit();
        }

        console.log(`[Migration] Éxito. Procesadas: ${processedBikes}, Bicis modif: ${modifiedBikes}, Garajes act: ${userGaragesUpdated}`);
        const modeMsg = isDryRun ? '[PRUEBA] Se procesarían' : 'Procesadas';
        return { 
            success: true, 
            message: `${modeMsg} ${processedBikes} bicis. Modificadas ${modifiedBikes} bicis y actualizados ${userGaragesUpdated} garajes.` 
        };

    } catch (error: any) {
        console.error("[Migration] Error Fatal:", error);
        return { success: false, message: 'Error en la migración: ' + error.message };
    }
}

/**
 * Exporta el catálogo único de bicicletas.
 * Devuelve un objeto con success y el contenido CSV o un error.
 */
export async function exportUniqueBikesCatalogAction() {
    const session = await getDecodedSession();
    
    if (!session?.uid) {
        return { success: false, error: 'No autorizado: Debes iniciar sesión.' };
    }

    const db = adminDb;

    try {
        const userDoc = await db.collection('users').doc(session.uid).get();
        if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
            return { success: false, error: 'No autorizado: Solo administradores pueden exportar el catálogo.' };
        }

        console.log(`[Export] Iniciando exportación solicitada por admin: ${session.uid}`);

        const bikesRef = db.collection('bikes');
        
        // Usar select para traer solo lo mínimo indispensable y ahorrar ancho de banda de red en Firebase
        const snapshot = await bikesRef.select('make', 'model', 'modelYear').get();
        
        if (snapshot.empty) {
            console.log('[Export] No se encontraron bicicletas en la colección.');
            return { success: true, csv: null };
        }

        console.log(`[Export] Procesando ${snapshot.size} documentos...`);

        const uniqueCatalog = new Map<string, { make: string, model: string, year: string, count: number }>();

        const normalizeString = (str?: string) => {
            if (!str) return 'DESCONOCIDO';
            return str.trim().toUpperCase().replace(/\s+/g, ' ');
        };

        snapshot.forEach(doc => {
            const data = doc.data();
            const make = normalizeString(data.make);
            const model = normalizeString(data.model);
            const year = data.modelYear ? data.modelYear.toString().trim() : 'DESCONOCIDO';
            
            if (make === 'DESCONOCIDO' || model === 'DESCONOCIDO') return;

            const key = `${make}|${model}|${year}`;
            
            if (uniqueCatalog.has(key)) {
                uniqueCatalog.get(key)!.count += 1;
            } else {
                uniqueCatalog.set(key, { make, model, year, count: 1 });
            }
        });

        const catalogArray = Array.from(uniqueCatalog.values()).sort((a, b) => {
            if (a.make !== b.make) return a.make.localeCompare(b.make);
            return b.count - a.count;
        });

        let csvContent = 'Marca,Modelo,Anio,Usuarios,MSRP_NUEVA_MXN\n';
        catalogArray.forEach(item => {
            const safeModel = `"${item.model.replace(/"/g, '""')}"`;
            const safeMake = `"${item.make.replace(/"/g, '""')}"`;
            csvContent += `${safeMake},${safeModel},${item.year},${item.count},\n`;
        });

        console.log(`[Export] Catálogo generado con ${catalogArray.length} modelos únicos.`);
        return { success: true, csv: csvContent };

    } catch (error: any) {
        console.error("Critical Export Error:", error);
        return { success: false, error: 'Error del servidor al generar el catálogo: ' + error.message };
    }
}

// --- GENERACIÓN DEL LIBRO AZUL ---
// Nota: La lógica de normalización se ha movido centralmente a src/lib/utils.ts (normalizeBrand, normalizeBikeModel)

export async function generateBlueBookAction(isDryRun: boolean = true) {
    const session = await getDecodedSession();
    
    if (!session?.uid) {
        return { success: false, message: 'No autorizado: Debes iniciar sesión.' };
    }

    const db = adminDb;

    try {
        const userDoc = await db.collection('users').doc(session.uid).get();
        if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
            return { success: false, message: 'No autorizado: Solo administradores pueden generar el Libro Azul.' };
        }

        console.log(`[BlueBook] Iniciando generación solicitada por admin: ${session.uid} (DryRun: ${isDryRun})`);

        const bikesRef = db.collection('bikes');
        
        // Obtenemos solo bicicletas con valor declarado, trayendo lo mínimo necesario
        const snapshot = await bikesRef.where('appraisedValue', '>=', 4000).select('make', 'model', 'modelYear', 'appraisedValue').get();
        
        if (snapshot.empty) {
            return { success: true, message: 'No se encontraron bicicletas válidas (> $4,000 MXN) para procesar.' };
        }

        const valuationMap = new Map<string, {
            displayBrand: string;
            displayModel: string;
            year: string;
            values: number[];
        }>();

        snapshot.forEach(doc => {
            const bike = doc.data();
            
            if (!bike.make || !bike.model || !bike.modelYear) return;

            const normBrand = normalizeBrand(bike.make);
            const { id: normModelId, display: displayModelLimpio } = normalizeBikeModel(bike.model, bike.make);
            
            // Si el modelo normalizado es clasificado como basura/inválido, lo descartamos
            if (normModelId === 'INVALID') return;

            const yearKey = bike.modelYear.toString();
            
            const compoundKey = `${normBrand}_${normModelId}_${yearKey}`;

            if (!valuationMap.has(compoundKey)) {
                valuationMap.set(compoundKey, {
                    displayBrand: bike.make,
                    displayModel: displayModelLimpio, 
                    year: yearKey,
                    values: []
                });
            }

            const val = Number(bike.appraisedValue);
            if (!isNaN(val) && val >= 4000) {
                valuationMap.get(compoundKey)!.values.push(val);
            }
        });

        let batch = db.batch();
        let opsCount = 0;
        let validModelsCount = 0;

        for (const [key, data] of valuationMap.entries()) {
            if (data.values.length < 1) continue; // Mínimo 1 registro requerido

            const sortedValues = data.values.sort((a, b) => a - b);
            const sampleSize = sortedValues.length;

            let min = sortedValues[0];
            let max = sortedValues[sampleSize - 1];

            // OUTLIER REMOVAL: Solo recortamos si la muestra es lo suficientemente grande (>=4)
            let safeValues = sortedValues;
            if (sampleSize >= 4) {
                const chopCount = Math.floor(sampleSize * 0.25);
                safeValues = sortedValues.slice(chopCount, sampleSize - chopCount);
                min = safeValues[0];
                max = safeValues[safeValues.length - 1];
            }
            
            const sum = safeValues.reduce((a, b) => a + b, 0);
            const average = Math.round(sum / safeValues.length);
            
            // Calcular nivel de confianza basado en la muestra pura
            let confidenceLevel = 'LOW';
            if (sampleSize >= 6) confidenceLevel = 'HIGH';
            else if (sampleSize >= 3) confidenceLevel = 'MEDIUM';

            const docRef = db.collection('blue-book-valuations').doc(key);
            
            // Extraer el modelId del compound key (para guardarlo explícitamente en el doc)
            const parts = key.split('_');
            const extractedBrand = parts[0];
            const extractedYear = parts[parts.length - 1];
            const extractedModelId = parts.slice(1, parts.length - 1).join('_');
            
            const payload = {
                brandId: extractedBrand,
                modelId: extractedModelId,
                displayBrand: data.displayBrand,
                displayModel: data.displayModel,
                year: data.year,
                stats: {
                    sampleSize,
                    safeSampleSize: safeValues.length,
                    averageValue: average,
                    minValue: min,
                    maxValue: max,
                    confidenceLevel
                },
                lastUpdated: new Date().toISOString()
            };

            if (!isDryRun) {
                batch.set(docRef, payload);
                opsCount++;

                if (opsCount >= 450) {
                    await batch.commit();
                    batch = db.batch();
                    opsCount = 0;
                }
            }
            validModelsCount++;
        }

        if (!isDryRun && opsCount > 0) {
            await batch.commit();
        }

        const modeMsg = isDryRun ? '[PRUEBA]' : '';
        return { 
            success: true, 
            message: `${modeMsg} Libro Azul generado con éxito. Se analizaron ${snapshot.size} bicicletas y se agregaron ${validModelsCount} modelos validados.`
        };

    } catch (error: any) {
        console.error("Blue Book Generation Error:", error);
        return { success: false, message: 'Error del servidor al generar el Libro Azul: ' + error.message };
    }
}