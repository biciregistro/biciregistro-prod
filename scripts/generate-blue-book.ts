import { adminDb } from '../src/lib/firebase/server';

/**
 * Script de Producción: Generación del "Libro Azul" Ciclista (RAG Database)
 * 
 * PROPÓSITO:
 * 1. Lee todas las bicicletas con valor en BiciRegistro.
 * 2. Normaliza agresivamente marcas y modelos para unificar variantes (ej. "Fuel EX 7" == "Fuel EX7").
 * 3. Descarta valores extremos (outliers).
 * 4. Guarda las estadísticas finales en la colección `blue-book-valuations` para ser consumidas por la IA.
 * 
 * EJECUCIÓN:
 * npx tsx --env-file=.env.local scripts/generate-blue-book.ts
 */

const DRY_RUN = false; // <-- Si es falso, escribe en Firestore

const normalizeBrand = (text: string | undefined): string => {
    if (!text) return 'UNKNOWN';
    return text.toLowerCase().trim().replace(/[-\s]+/g, '_').replace(/[^a-z0-9_]/g, '');
};

// Normalización más agresiva para modelos (junta todo para evitar errores de tipeo comunes)
const normalizeModel = (text: string | undefined): string => {
    if (!text) return 'UNKNOWN';
    // Quitamos todos los espacios y caracteres especiales. "Fuel EX 7" -> "fuelex7"
    return text.toLowerCase().replace(/[^a-z0-9]/g, '');
};

interface BikeData {
    make: string;
    model: string;
    modelYear: string;
    appraisedValue: number;
}

async function runBlueBookGeneration() {
    console.log(`\n📘 INICIANDO GENERACIÓN DEL "LIBRO AZUL" ${DRY_RUN ? '[DRY RUN]' : '[PRODUCCIÓN]'}`);
    
    try {
        const bikesRef = adminDb.collection('bikes');
        
        console.log('1️⃣ Descargando inventario de bicicletas...');
        const snapshot = await bikesRef.where('appraisedValue', '>', 0).get();
        console.log(`✅ ${snapshot.size} bicicletas con valor declarado encontradas.\n`);

        const valuationMap = new Map<string, {
            displayBrand: string;
            displayModel: string;
            year: string;
            values: number[];
        }>();

        console.log('2️⃣ Normalizando y agrupando datos...');
        snapshot.forEach(doc => {
            const bike = doc.data() as BikeData;
            
            if (!bike.make || !bike.model || !bike.modelYear) return;

            const normBrand = normalizeBrand(bike.make);
            const normModel = normalizeModel(bike.model);
            const yearKey = bike.modelYear.toString();
            
            const compoundKey = `${normBrand}_${normModel}_${yearKey}`;

            if (!valuationMap.has(compoundKey)) {
                valuationMap.set(compoundKey, {
                    displayBrand: bike.make,
                    // Nos quedamos con la primera forma en que el modelo fue escrito como "display"
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

        console.log('3️⃣ Procesando estadísticas y escribiendo en la base de datos...');
        
        let batch = adminDb.batch();
        let opsCount = 0;
        let validModelsCount = 0;

        for (const [key, data] of valuationMap.entries()) {
            if (data.values.length < 2) continue; // Mínimo 2 registros para hacer un promedio

            const sortedValues = data.values.sort((a, b) => a - b);
            const sampleSize = sortedValues.length;

            let min = sortedValues[0];
            let max = sortedValues[sampleSize - 1];

            // OUTLIER REMOVAL BÁSICO: Si la muestra es grande (>=4), quitamos el 25% más alto y más bajo para 
            // proteger el promedio de usuarios que meten $1 MXN o $1,000,000 MXN de broma.
            let safeValues = sortedValues;
            if (sampleSize >= 4) {
                const chopCount = Math.floor(sampleSize * 0.25);
                safeValues = sortedValues.slice(chopCount, sampleSize - chopCount);
                // Actualizamos min y max a los valores seguros
                min = safeValues[0];
                max = safeValues[safeValues.length - 1];
            }
            
            const sum = safeValues.reduce((a, b) => a + b, 0);
            const average = Math.round(sum / safeValues.length);

            const docRef = adminDb.collection('blue-book-valuations').doc(key);
            
            const payload = {
                brandId: normalizeBrand(data.displayBrand),
                modelId: normalizeModel(data.displayModel),
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

            if (!DRY_RUN) {
                batch.set(docRef, payload);
                opsCount++;

                if (opsCount >= 450) {
                    await batch.commit();
                    console.log('   ⏳ Batch commiteado...');
                    batch = adminDb.batch();
                    opsCount = 0;
                }
            } else {
                console.log(`[DRY-RUN] Guardaría: ${key} -> Promedio: $${average} (Muestra: ${sampleSize})`);
            }
            validModelsCount++;
        }

        if (!DRY_RUN && opsCount > 0) {
            await batch.commit();
            console.log('   ⏳ Batch final commiteado...');
        }

        console.log(`\n🎉 PROCESO FINALIZADO. ${validModelsCount} modelos agregados al Libro Azul.`);

    } catch (error) {
        console.error('❌ ERROR DURANTE LA GENERACIÓN:', error);
    }
}

runBlueBookGeneration();