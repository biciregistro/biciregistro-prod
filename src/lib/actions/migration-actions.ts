'use server';

import { getDecodedSession } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/server';

export async function runAnalyticsDenormalizationMigration(isDryRun: boolean = true) {
    const session = await getDecodedSession();
    if (!session?.uid || session.role !== 'admin') {
        throw new Error('Unauthorized');
    }

    try {
        const db = adminDb;
        const usersRef = db.collection('users');
        const bikesRef = db.collection('bikes');

        const bikesSnapshot = await bikesRef.get();
        if (bikesSnapshot.empty) {
            return { success: true, message: 'No bikes found to migrate.' };
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

            if (!userId) {
                console.log(`[Migration] Bike ${bikeDoc.id} has no userId. Skipping.`);
                continue;
            }

            let userData = userCache.get(userId);
            if (!userData) {
                const userDoc = await usersRef.doc(userId).get();
                if (userDoc.exists) {
                    userData = userDoc.data();
                    userCache.set(userId, userData);
                } else {
                    console.log(`[Migration] User ${userId} not found for bike ${bikeDoc.id}. Skipping.`);
                    continue;
                }
            }

            // 1. UPDATE BIKE DOCUMENT WITH DENORMALIZED USER DATA
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

            // 2. UPDATE USER DOCUMENT (GARAGE DATA)
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
                userCache.set(userId, userData); // Keep cache fresh
                
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

            // Commit batch if limit reached (Firestore limits batches to 500 operations)
            if (batchCount >= 450 && !isDryRun) {
                console.log(`[Migration] Committing batch of ${batchCount} operations...`);
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
            }
        }

        // Commit final batch
        if (batchCount > 0 && !isDryRun) {
            console.log(`[Migration] Committing final batch of ${batchCount} operations...`);
            await batch.commit();
        }

        const modeMsg = isDryRun ? '[DRY RUN] Would process' : 'Processed';
        return { 
            success: true, 
            message: `${modeMsg} ${processedBikes} bikes. Modified ${modifiedBikes} bikes and updated ${userGaragesUpdated} user garages.` 
        };

    } catch (error: any) {
        console.error("Migration Error:", error);
        throw new Error(error.message || 'Migration failed');
    }
}

// NUEVA FUNCIÓN: Extracción de Catálogo de Bicicletas Únicas
export async function exportUniqueBikesCatalogAction() {
    const session = await getDecodedSession();
    if (!session?.uid || session.role !== 'admin') {
        throw new Error('Unauthorized');
    }

    try {
        const db = adminDb;
        const bikesRef = db.collection('bikes');
        
        // Obtenemos solo los campos necesarios para reducir consumo de memoria y lecturas
        const snapshot = await bikesRef.select('make', 'model', 'modelYear').get();
        
        if (snapshot.empty) {
            return null;
        }

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
            
            // Ignoramos registros vacíos
            if (make === 'DESCONOCIDO' || model === 'DESCONOCIDO') return;

            const key = `${make}|${model}|${year}`;
            
            if (uniqueCatalog.has(key)) {
                uniqueCatalog.get(key)!.count += 1;
            } else {
                uniqueCatalog.set(key, { make, model, year, count: 1 });
            }
        });

        // Convertir a Array y ordenar (Por marca, luego por popularidad descendente)
        const catalogArray = Array.from(uniqueCatalog.values()).sort((a, b) => {
            if (a.make !== b.make) return a.make.localeCompare(b.make);
            return b.count - a.count;
        });

        // Construir contenido CSV
        let csvContent = 'Marca,Modelo,Anio,Usuarios,MSRP_NUEVA_MXN\n';
        
        catalogArray.forEach(item => {
            // Escapar comillas dobles en caso de que un modelo las contenga (ej. 29")
            const safeModel = `"${item.model.replace(/"/g, '""')}"`;
            const safeMake = `"${item.make.replace(/"/g, '""')}"`;
            csvContent += `${safeMake},${safeModel},${item.year},${item.count},\n`;
        });

        return csvContent;

    } catch (error: any) {
        console.error("Export Catalog Error:", error);
        throw new Error(error.message || 'Falló la extracción del catálogo');
    }
}
