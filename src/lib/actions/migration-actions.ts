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
