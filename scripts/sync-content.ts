
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { defaultHomepageData } from '../src/lib/homepage-data';
import { defaultLandingEventsData } from '../src/lib/data/landing-events-data';

// Función para cargar variables de entorno manualmente sin dependencias externas
function loadEnv() {
    try {
        const envPath = path.resolve('.env.local');
        if (fs.existsSync(envPath)) {
            console.log("📄 Cargando variables desde .env.local...");
            const envConfig = fs.readFileSync(envPath, 'utf8');
            envConfig.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    let value = match[2].trim();
                    // Eliminar comillas simples o dobles envolventes si existen
                    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    process.env[key] = value;
                }
            });
        }
    } catch (e) {
        console.warn("⚠️ No se pudo leer .env.local. Se usarán las variables del sistema.");
    }
}

loadEnv();

// Intentar obtener las credenciales de dos formas:
// 1. Variable única con el JSON completo (FIREBASE_SERVICE_ACCOUNT_KEY)
// 2. Variables individuales (FIREBASE_PROJECT_ID, etc.)

let serviceAccount: any;

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (serviceAccountKey) {
    try {
        serviceAccount = JSON.parse(serviceAccountKey);
    } catch (e) {
        console.error("❌ ERROR: FIREBASE_SERVICE_ACCOUNT_KEY no es un JSON válido.");
        process.exit(1);
    }
} else {
    // Intentar construir desde variables individuales
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
        serviceAccount = {
            project_id: projectId,
            client_email: clientEmail,
            // Reemplazar saltos de línea escapados (\n) por saltos reales
            private_key: privateKey.replace(/\\n/g, '\n'),
        };
    } else {
        console.error("❌ ERROR: No se encontraron credenciales válidas.");
        console.error("Debes definir FIREBASE_SERVICE_ACCOUNT_KEY (JSON)");
        console.error("O las variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY");
        process.exit(1);
    }
}

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

async function syncContent() {
    console.log("🚀 Iniciando sincronización segura de contenido...");
    console.log(`Target Project ID: ${serviceAccount.project_id}`);

    try {
        // ---------------------------------------------------------
        // 1. HOME PAGE (Colección 'homepage')
        // ---------------------------------------------------------
        console.log("\n📦 Verificando Homepage...");
        const homepageSections = Object.entries(defaultHomepageData);
        
        for (const [key, data] of homepageSections) {
            const docRef = db.collection('homepage').doc(key);
            const doc = await docRef.get();
            
            if (!doc.exists) {
                // SOLO si no existe, lo creamos.
                await docRef.set(data);
                console.log(`   ✅ [NUEVO] Se creó la sección: '${key}'`);
            } else {
                // Si existe, NO tocamos nada para respetar datos de producción.
                console.log(`   🛡️  [EXISTENTE] La sección '${key}' ya existe. Se mantiene intacta.`);
            }
        }

        // ---------------------------------------------------------
        // 2. LANDING EVENTS (Colección 'content' -> doc 'landing-events')
        // ---------------------------------------------------------
        console.log("\n🎉 Verificando Landing Page de Eventos...");
        
        const landingDocRef = db.collection('content').doc('landing-events');
        const landingDoc = await landingDocRef.get();

        if (!landingDoc.exists) {
            await landingDocRef.set(defaultLandingEventsData);
            console.log(`   ✅ [NUEVO] Se creó el contenido inicial de 'landing-events'`);
        } else {
            console.log(`   🛡️  [EXISTENTE] El contenido de 'landing-events' ya existe. Se mantiene intacta.`);
        }

        console.log("\n✨ Sincronización finalizada con éxito.");

    } catch (error) {
        console.error("\n❌ Error crítico durante la sincronización:", error);
        process.exit(1);
    }
}

syncContent();
