import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

// 1. Configuración de Firebase Admin (Requiere que tengas las variables en .env.local)
const serviceAccountKey = process.env.FIREBASE_PRIVATE_KEY;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (!serviceAccountKey || !projectId || !clientEmail) {
  console.error('❌ Faltan credenciales de Firebase Admin en .env.local');
  process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: serviceAccountKey.replace(/\\n/g, '\n'),
      }),
    });
}

const db = admin.firestore();

// 2. Normalización de Cadenas (Para evitar duplicados como "Trek " y "trek")
function normalizeString(str?: string): string {
    if (!str) return 'DESCONOCIDO';
    return str.trim().toUpperCase().replace(/\s+/g, ' ');
}

// 3. Ejecución del Script
async function extractUniqueBikeCatalog() {
    console.log('🚲 Iniciando extracción del catálogo único de bicicletas...');
    
    try {
        const bikesRef = db.collection('bikes');
        // Traemos TODAS las bicicletas (Ojo si tienes millones, esto podría requerir paginación, 
        // pero asumimos que por ahora cabe en memoria)
        const snapshot = await bikesRef.select('make', 'model', 'modelYear').get();
        
        console.log(`📦 Encontradas ${snapshot.size} bicicletas en total.`);
        
        // Usamos un Map para garantizar unicidad. La clave será "MARCA|MODELO|AÑO"
        const uniqueCatalog = new Map<string, { make: string, model: string, year: string, count: number }>();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const make = normalizeString(data.make);
            const model = normalizeString(data.model);
            const year = data.modelYear ? data.modelYear.toString().trim() : 'DESCONOCIDO';
            
            // Ignoramos registros basura obvios si los hubiera
            if (make === 'DESCONOCIDO' || model === 'DESCONOCIDO') return;

            const key = `${make}|${model}|${year}`;
            
            if (uniqueCatalog.has(key)) {
                // Incrementamos el contador para saber cuáles son los modelos más populares
                const existing = uniqueCatalog.get(key)!;
                existing.count += 1;
            } else {
                // Añadimos el nuevo modelo único
                uniqueCatalog.set(key, { make, model, year, count: 1 });
            }
        });

        console.log(`✨ Procesamiento completo. Encontrados ${uniqueCatalog.size} modelos únicos.`);
        
        // 4. Convertir a Array y ordenar (Primero por Marca, luego por popularidad para priorizar)
        const catalogArray = Array.from(uniqueCatalog.values()).sort((a, b) => {
            if (a.make !== b.make) return a.make.localeCompare(b.make);
            return b.count - a.count; // Los más populares de esa marca primero
        });

        // 5. Exportar a CSV (Para que sea fácil copiarlo y pegarlo a Gemini/ChatGPT)
        const csvPath = path.join(process.cwd(), 'scripts', 'bike_catalog_export.csv');
        
        // Cabeceras del CSV
        let csvContent = 'Marca,Modelo,Anio,CantidadUsuarios,MSRP_NUEVA_MXN_SUGERIDO\n';
        
        catalogArray.forEach(item => {
            // Escapamos comas en los modelos (ej. "Talon 3, Azul") para no romper el CSV
            const safeModel = `"${item.model.replace(/"/g, '""')}"`;
            csvContent += `${item.make},${safeModel},${item.year},${item.count},\n`;
        });
        
        fs.writeFileSync(csvPath, csvContent, 'utf-8');
        
        console.log(`✅ ¡Éxito! Archivo guardado en: ${csvPath}`);
        console.log(`\n📋 INSTRUCCIONES PARA GEMINI / CHATGPT:`);
        console.log(`"Toma el siguiente archivo CSV. Por favor, investiga en la web el Precio de Lista Original (MSRP) en PESOS MEXICANOS cuando era NUEVA para cada bicicleta. Llena la última columna 'MSRP_NUEVA_MXN_SUGERIDO' únicamente con el número entero. No cambies las otras columnas."`);
        
    } catch (error) {
        console.error('❌ Error durante la extracción:', error);
    } finally {
        process.exit(0);
    }
}

extractUniqueBikeCatalog();
