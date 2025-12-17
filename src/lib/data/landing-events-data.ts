// src/lib/data/landing-events-data.ts
import { adminDb } from '@/lib/firebase/server';
import { LandingEventsContent } from '@/lib/types';
// Note: We are using firebase-admin/firestore, not firebase/firestore
import { FieldValue } from 'firebase-admin/firestore'; 

const LANDING_EVENTS_DOC_PATH = 'content/landingEventsManager';

/**
 * Fetches the content for the Events Manager landing page.
 * Returns the data or a default structure if it doesn't exist.
 */
export async function getLandingEventsContent(): Promise<LandingEventsContent> {
  try {
    const docRef = adminDb.doc(LANDING_EVENTS_DOC_PATH);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return docSnap.data() as LandingEventsContent;
    } else {
      console.log("Document 'landingEventsManager' does not exist. Returning default content.");
      return getDefaultLandingEventsContent();
    }
  } catch (error) {
    console.error("Error fetching landing events content:", error);
    // In case of error, return default content to prevent page crash
    return getDefaultLandingEventsContent();
  }
}

/**
 * Saves the entire content object for the Events Manager landing page.
 * @param content The full LandingEventsContent object.
 */
export async function saveLandingEventsContent(content: LandingEventsContent): Promise<void> {
    const docRef = adminDb.doc(LANDING_EVENTS_DOC_PATH);
    await docRef.set(content, { merge: true });
}

/**
 * Updates a specific section of the landing page content.
 * @param sectionKey The key of the section to update (e.g., 'hero', 'featureSection').
 * @param data The data for that section.
 */
export async function updateLandingEventsSection(sectionKey: keyof LandingEventsContent, data: any): Promise<void> {
    const docRef = adminDb.doc(LANDING_EVENTS_DOC_PATH);
    // Use dot notation to update nested fields without overwriting the whole document
    await docRef.update({
        [sectionKey]: data
    });
}


/**
 * Provides a default structure for the landing page content.
 * This is used when the document in Firestore doesn't exist yet.
 */
function getDefaultLandingEventsContent(): LandingEventsContent {
    return {
        hero: {
            title: "Deja de 'organizar carreras' y empieza a gestionar un negocio deportivo rentable y blindado.",
            subtitle: "Transformamos el caos operativo en inteligencia de datos. Monetiza tu audiencia, blinda tu responsabilidad legal y elimina las filas de registro con la única plataforma 'todo en uno' para ciclismo.",
            ctaButton: "Solicitar una Demo Personalizada",
            trustCopy: "Validado en eventos de +5,000 ciclistas. Cero papel, cero riesgo.",
            backgroundImageUrl: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        },
        painPointsSection: {
            title: "¿Te suena familiar este caos?",
            points: [
                { id: 'financial', title: "El Agujero Negro Financiero", description: "Pides patrocinios a ciegas y no puedes demostrar el ROI a las marcas. Tu evento sobrevive, pero no crece." },
                { id: 'legal', title: "El Riesgo Legal Latente", description: "Cajas llenas de responsivas en papel mojado que no te protegerán en un juicio real. Vives cruzando los dedos." },
                { id: "logistics", title: "La Pesadilla Logística", description: "Filas eternas, staff estresado y el miedo constante a que se cuelen bicicletas robadas en tu evento." }
            ]
        },
        solutionSection: {
            title: "El Nuevo Estándar en Gestión de Eventos Ciclistas.",
            solutions: [
                { id: 'monetization', title: "Radiografía Financiera de tu Audiencia", description: "No vendas 'logos en una lona'. Entrega a tus patrocinadores data dura sobre el valor de la flota participante, demografía y poder adquisitivo. Cierra tratos B2B reales." },
                { id: 'legal', title: "Smart Waiver Jurídico", description: "Olvida el papel. Responsivas digitales con trazabilidad forense (IP, Timestamp, Validación de Identidad) que sí te protegen ante demandas." },
                { id: "operations", title: "Check-in Ultrarrápido y Seguro", description: "Valida pago + identidad + bicicleta en menos de 3 segundos. Además, la certificación 'Rodada Segura' bloquea automáticamente bicis con reporte de robo." }
            ]
        },
        featureSection: {
            title: "¿Sabes cuánto dinero está rodando en tu evento?",
            description: "Nosotros sí, y te ayudamos a presentarlo a tus patrocinadores. Biciregistro Event Manager convierte a tus inscritos en tu activo más valioso.",
            imageUrl: "https://placehold.co/600x400/png?text=Dashboard+Screenshot",
        },
        socialProofSection: {
            allies: [],
        },
        ctaSection: {
            title: "¿Listo para profesionalizar tu próximo evento?",
            description: "Deja que la tecnología maneje el caos y enfócate en la experiencia del ciclista.",
            ctaButton: "Hablar con un Experto",
        }
    };
}
