
import * as admin from 'firebase-admin';
import { applicationDefault } from 'firebase-admin/app';

// Configuración
const PROJECT_ID = 'biciregistro-prod';

// Datos por defecto (Copiados de src/lib/homepage-data.ts para el script standalone)
const defaultHomepageData = {
  hero: {
    id: 'hero',
    title: 'Registra tu Bici, Protege tu Pasión',
    subtitle: 'La plataforma comunitaria para registrar, transferir y reportar bicicletas de forma segura y confiable.',
    buttonText: 'Registra tu Bici Gratis',
    imageUrl: 'https://images.unsplash.com/photo-1664853811022-33e391e36169?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxjeWNsaXN0JTIwc3Vuc2V0fGVufDB8fHx8MTc2MTg5MTcyMnww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  features: {
    id: 'features',
    title: '¿Por Qué BiciRegistro?',
    subtitle: 'Te ofrecemos herramientas simples y potentes para la seguridad de tu bicicleta.',
    features: [
      {
        id: 'feature-1', // Añadí IDs explícitos para mejor gestión
        title: 'Registro Único y Permanente',
        description: 'Asocia el número de serial de tu bici a tu identidad de forma permanente. Un registro digital que te acompaña siempre.',
        imageUrl: 'https://images.unsplash.com/photo-1602226348831-e263d0f7acd2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxiaWtlJTIwUVJjb2RlfGVufDB8fHx8MTc2MTkyNzAxN3ww&ixlib=rb-4.1.0&q=80&w=1080',
      },
      {
        id: 'feature-2',
        title: 'Reporte de Robo Simplificado',
        description: 'En caso de robo, marca tu bici como robada al instante. Esto alerta a la comunidad y a potenciales compradores.',
        imageUrl: 'https://images.unsplash.com/photo-1732724081252-a0a92895558a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxtYXAlMjBsb2NhdGlvbnxlbnwwfHx8fDE3NjE4MzgzNzN8MA&ixlib=rb-4.1.0&q=80&w=1080',
      },
      {
        id: 'feature-3',
        title: 'Comunidad Conectada',
        description: 'Al buscar una bici de segunda mano, verifica su estado en nuestra base de datos para evitar comprar artículos robados.',
        imageUrl: 'https://images.unsplash.com/photo-1750064960540-4369ab71ccdc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxjeWNsaXN0cyUyMGNvbW11bml0eXxlbnwwfHx8fDE3NjE5MjcwMTZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      },
    ],
  },
  cta: {
    id: 'cta',
    title: '¿Listo para unirte a la comunidad?',
    subtitle: 'El registro es rápido, fácil y el primer paso para proteger tu bicicleta. No esperes a que sea demasiado tarde.',
    buttonText: 'Comienza Ahora',
    imageUrl: 'https://images.unsplash.com/photo-1605621290414-c8b7498408fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxiaWtlJTIwbG9ja3xlbnwwfHx8fDE3NjE5MjcwMTd8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
};

async function seedHomepage() {
  console.log(`🚀 Iniciando Seeding de Homepage en: ${PROJECT_ID}`);

  // Inicialización
  if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: applicationDefault(),
            projectId: PROJECT_ID,
        });
    } catch (e) {
        console.error("❌ Error al inicializar Firebase Admin.");
        process.exit(1);
    }
  }

  const db = admin.firestore();
  const batch = db.batch();

  try {
    // 1. Hero Section
    console.log("📝 Preparando sección: Hero");
    const heroRef = db.collection('homepage').doc('hero');
    batch.set(heroRef, defaultHomepageData.hero, { merge: true });

    // 2. Features Section
    console.log("📝 Preparando sección: Features");
    const featuresRef = db.collection('homepage').doc('features');
    // Para features, si ya existen, queremos asegurarnos de que la estructura sea correcta.
    // merge: true preservará campos de nivel superior si existen, pero sobrescribirá el array 'features' si se pasa.
    // Dado que el problema es que faltan, escribiremos los datos por defecto.
    batch.set(featuresRef, defaultHomepageData.features, { merge: true });

    // 3. CTA Section
    console.log("📝 Preparando sección: CTA");
    const ctaRef = db.collection('homepage').doc('cta');
    batch.set(ctaRef, defaultHomepageData.cta, { merge: true });

    console.log("⚡ Ejecutando escritura en lote...");
    await batch.commit();

    console.log("\n" + "=".repeat(50));
    console.log("🎉 ¡ÉXITO! LA ESTRUCTURA DEL HOMEPAGE HA SIDO RESTAURADA");
    console.log("=".repeat(50));
    console.log("Ahora deberías ver todos los campos en tu panel de administración.");

  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
    process.exit(1);
  }
}

seedHomepage();
