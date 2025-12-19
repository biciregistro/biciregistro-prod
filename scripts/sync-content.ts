
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
                    const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // Eliminar comillas
                    process.env[key] = value;
                }
            });
        }
    } catch (e) {
        console.warn("⚠️ No se pudo leer .env.local. Se usarán las variables del sistema.");
    }
}

loadEnv();

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
    console.error("❌ ERROR: No se encontró FIREBASE_SERVICE_ACCOUNT_KEY.");
    console.error("Este script requiere credenciales de administrador para escribir en Firestore.");
    console.error("Asegúrate de tener un archivo .env.local con esta variable o configurarla en tu entorno.");
    process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountKey);

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
