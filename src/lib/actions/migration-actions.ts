'use server';

import { getDecodedSession } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/server';

export async function runAnalyticsDenormalizationMigration(isDryRun: boolean = true) {
    const session = await getDecodedSession();
    if (!session?.uid || session.role !== 'admin') {
        return { success: false, message: 'No autorizado.' };
    }

    try {
        const db = adminDb;
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
                const userDoc = await usersRef.doc(userId).get();
                if (userDoc.exists) {
                    userData = userDoc.data();
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

            if (needsBikeUpdate) {
                if (!isDryRun) {
                    batch.update(bikeDoc.ref, updatePayload);
                    batchCount++;
                }
                modifiedBikes++;
            }

            const ownedBrands = new Set(userData.ownedBrands || []);
            const ownedModalities = new Set(userData.ownedModalities || []);
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

            if (needsUserUpdate) {
                userData.ownedBrands = Array.from(ownedBrands);
                userData.ownedModalities = Array.from(ownedModalities);
                userData.hasStolenBikes = hasStolenBikes;
                userCache.set(userId, userData); 
                
                if (!isDryRun) {
                    batch.update(usersRef.doc(userId), {
                        ownedBrands: userData.ownedBrands,
                        ownedModalities: userData.ownedModalities,
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

        const modeMsg = isDryRun ? '[PRUEBA] Se procesarían' : 'Procesadas';
        return { 
            success: true, 
            message: `${modeMsg} ${processedBikes} bicis. Modificadas ${modifiedBikes} bicis y actualizados ${userGaragesUpdated} garajes.` 
        };

    } catch (error: any) {
        console.error("Migration Error:", error);
        return { success: false, message: 'Error en la migración: ' + error.message };
    }
}

/**
 * Exporta el catálogo único de bicicletas.
 * Devuelve un objeto con success y el contenido CSV o un error.
 */
export async function exportUniqueBikesCatalogAction() {
    const session = await getDecodedSession();
    if (!session?.uid || session.role !== 'admin') {
        return { success: false, error: 'No autorizado' };
    }

    console.log(`[Export] Iniciando exportación solicitada por admin: ${session.uid}`);

    try {
        const db = adminDb;
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
