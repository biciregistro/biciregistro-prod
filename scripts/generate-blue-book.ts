import { adminDb } from '../src/lib/firebase/server';
import { normalizeBrand, normalizeBikeModel } from '../src/lib/utils';
// import { ai } from '../src/ai/genkit'; // <-- Descomentar cuando habilitemos la fase asíncrona por IA

/**
 * Script de Producción: Generación del "Libro Azul" Ciclista (RAG Database)
 * 
 * PROPÓSITO:
 * 1. Lee todas las bicicletas con valor en BiciRegistro (> $4000 MXN).
 * 2. Normaliza quirúrgicamente marcas y modelos.
 * 3. Crea un catálogo base y determina niveles de confianza.
 * 4. Guarda las estadísticas en `blue-book-valuations` para ser consumidas por la IA.
 * 
 * EJECUCIÓN:
 * npx tsx --env-file=.env.local scripts/generate-blue-book.ts
 */

const DRY_RUN = false; // <-- Si es falso, escribe en Firestore

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
        
        console.log('1️⃣ Descargando inventario de bicicletas (> $4000 MXN)...');
        // Filtramos desde la raíz las bicicletas basura o infantiles muy baratas
        const snapshot = await bikesRef.where('appraisedValue', '>=', 4000).get();
        console.log(`✅ ${snapshot.size} bicicletas con valor razonable encontradas.\n`);

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
            const { id: normModelId, display: displayModelLimpio } = normalizeBikeModel(bike.model, bike.make);
            
            // Si la normalización quirúrgica determina que es un relato, color, talla, lo ignoramos
            if (normModelId === 'INVALID') return;

            const yearKey = bike.modelYear.toString();
            
            const compoundKey = `${normBrand}_${normModelId}_${yearKey}`;

            if (!valuationMap.has(compoundKey)) {
                valuationMap.set(compoundKey, {
                    displayBrand: bike.make,
                    // Utilizamos el display model limpio capitalizado en lugar del texto crudo del usuario
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

        console.log('3️⃣ Procesando estadísticas, niveles de confianza y escribiendo en la base de datos...');
        
        let batch = adminDb.batch();
        let opsCount = 0;
        let validModelsCount = 0;

        for (const [key, data] of valuationMap.entries()) {
            if (data.values.length < 1) continue; // Mínimo 1 registro requerido

            const sortedValues = data.values.sort((a, b) => a - b);
            const sampleSize = sortedValues.length;

            let min = sortedValues[0];
            let max = sortedValues[sampleSize - 1];

            // OUTLIER REMOVAL BÁSICO: Si la muestra es grande (>=4), quitamos el 25% más alto y más bajo
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

            const docRef = adminDb.collection('blue-book-valuations').doc(key);
            
            // Extraer el modelId del compound key (para guardarlo explícitamente en el doc)
            const parts = key.split('_');
            // brand_model_year. Model can have underscores if it had them, but our normalization removes them.
            // Safe fallback is to reconstruct modelId:
            const extractedBrand = parts[0];
            const extractedYear = parts[parts.length - 1];
            const extractedModelId = parts.slice(1, parts.length - 1).join('_');
            
            const payload = {
                brandId: extractedBrand,
                modelId: extractedModelId,
                displayBrand: data.displayBrand,
                displayModel: data.displayModel, // <-- Ahora es "XTA 1.0" limpio y bonito
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
                console.log(`[DRY-RUN] Guardaría: ${key} -> Promedio: $${average} (Confianza: ${confidenceLevel}, Muestra: ${sampleSize})`);
            }
            validModelsCount++;
        }

        if (!DRY_RUN && opsCount > 0) {
            await batch.commit();
            console.log('   ⏳ Batch final commiteado...');
        }

        console.log(`\n🎉 PROCESO FINALIZADO. ${validModelsCount} modelos agregados al Libro Azul Curado.`);
        console.log(`💡 PRÓXIMA FASE: Implementar barrido asíncrono con IA para validar precios LOW Confidence.`);

    } catch (error) {
        console.error('❌ ERROR DURANTE LA GENERACIÓN:', error);
    }
}

runBlueBookGeneration();