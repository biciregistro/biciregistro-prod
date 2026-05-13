'use server';

import { getDecodedSession } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/server';
import { BIKE_RANGES } from '@/lib/constants/bike-ranges';

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
const normalizeBrand = (text: string | undefined): string => {
    if (!text) return 'UNKNOWN';
    return text.toLowerCase().trim().replace(/[-\s]+/g, '_').replace(/[^a-z0-9_]/g, '');
};

// Limpieza agresiva de modelos usando Regex para remover basura del usuario
const normalizeModel = (modelRaw: string | undefined, brandRaw?: string): string => {
    if (!modelRaw) return 'UNKNOWN';
    
    let cleanModel = modelRaw.toLowerCase().trim();

    // 1. Quitar la marca si el usuario la repitió adentro del modelo (ej: "Benotto HK3" -> "HK3")
    if (brandRaw) {
        const brandLower = brandRaw.toLowerCase().trim();
        cleanModel = cleanModel.replace(new RegExp(`\\b${brandLower}\\b`, 'g'), '');
    }

    // 2. Diccionario de "Stop Words" Ciclistas (Materiales, Colores, Tallas, Componentes)
    const stopWords = [
        // Materiales
        'aluminio', 'carbono', 'carbon', 'alloy', 'fibra', 'acero',
        // Tallas y Ruedas
        'r29', 'r27.5', 'r26', 'r700', '29er', '29"', '27.5"', 'rodada', 'rin',
        'talla', 'chica', 'mediana', 'grande', 'small', 'medium', 'large',
        // Componentes Generales
        'frenos', 'disco', 'hidraulicos', 'mecanicos', 'suspension', 'horquilla',
        'shimano', 'sram', 'deore', 'xt', 'slx', 'altus', 'tourney', 'sx', 'nx', 'gx', 'fox', 'rockshox',
        // Transmisiones
        '1x10', '1x11', '1x12', '2x10', '3x8', '21v', '24v', 'vel', 'velocidades',
        // Estados y Colores
        'nueva', 'usada', 'seminueva', 'roja', 'rojo', 'azul', 'negro', 'negra', 'verde', 'blanco', 'blanca', 'gris', 'mate'
    ];

    // Remover Stop Words usando boundaries \b para no cortar palabras a la mitad
    stopWords.forEach(word => {
        cleanModel = cleanModel.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
    });

    // 3. Quitar años sueltos si el usuario los puso en el modelo (ej. "Marlin 6 2022")
    cleanModel = cleanModel.replace(/\b20[0-2][0-9]\b/g, ''); 

    // 4. Normalización final: Juntar todo y quitar espacios/simbolos (ej: "fuel ex 7" -> "fuelex7")
    return cleanModel.replace(/[^a-z0-9]/g, '');
};

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
        const snapshot = await bikesRef.where('appraisedValue', '>', 0).select('make', 'model', 'modelYear', 'appraisedValue').get();
        
        if (snapshot.empty) {
            return { success: true, message: 'No se encontraron bicicletas con valor declarado para procesar.' };
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
            const normModel = normalizeModel(bike.model, bike.make);
            const yearKey = bike.modelYear.toString();
            
            const compoundKey = `${normBrand}_${normModel}_${yearKey}`;

            if (!valuationMap.has(compoundKey)) {
                valuationMap.set(compoundKey, {
                    displayBrand: bike.make,
                    displayModel: bike.model, 
                    year: yearKey,
                    values: []
                });
            }

            const val = Number(bike.appraisedValue);
            if (!isNaN(val) && val > 0) {
                valuationMap.get(compoundKey)!.values.push(val);
            }
        });

        let batch = db.batch();
        let opsCount = 0;
        let validModelsCount = 0;

        for (const [key, data] of valuationMap.entries()) {
            if (data.values.length < 2) continue; // Mínimo 2 registros para consenso estadístico

            const sortedValues = data.values.sort((a, b) => a - b);
            const sampleSize = sortedValues.length;

            let min = sortedValues[0];
            let max = sortedValues[sampleSize - 1];

            // OUTLIER REMOVAL (Protección contra valores de broma)
            let safeValues = sortedValues;
            if (sampleSize >= 4) {
                const chopCount = Math.floor(sampleSize * 0.25);
                safeValues = sortedValues.slice(chopCount, sampleSize - chopCount);
                min = safeValues[0];
                max = safeValues[safeValues.length - 1];
            }
            
            const sum = safeValues.reduce((a, b) => a + b, 0);
            const average = Math.round(sum / safeValues.length);

            const docRef = db.collection('blue-book-valuations').doc(key);
            
            const payload = {
                brandId: normalizeBrand(data.displayBrand),
                modelId: normalizeModel(data.displayModel, data.displayBrand),
                displayBrand: data.displayBrand,
                displayModel: data.displayModel,
                year: data.year,
                stats: {
                    sampleSize,
                    safeSampleSize: safeValues.length,
                    averageValue: average,
                    minValue: min,
                    maxValue: max
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
            message: `${modeMsg} Libro Azul generado con éxito. Se analizaron ${snapshot.size} bicicletas y se calcularon promedios para ${validModelsCount} modelos con consenso.`
        };

    } catch (error: any) {
        console.error("Blue Book Generation Error:", error);
        return { success: false, message: 'Error del servidor al generar el Libro Azul: ' + error.message };
    }
}
