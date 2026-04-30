'use server';

import { getAuthenticatedUser } from '@/lib/data';
import { ai } from '@/ai/genkit';
import { MEXICO_CYCLING_MARKET_REPORT } from '../constants/mexico-cycling-market';

const SPONSOR_REPORT_PROMPT_TEMPLATE = `
Actúa como un Director de Marketing y Estrategia Senior. Tu objetivo es generar un reporte de insights de alto nivel sobre un evento ciclista, dirigido al equipo de marketing de una empresa patrocinadora.

DATOS DEL MERCADO MEXICANO (Contexto Estratégico):
{{MARKET_CONTEXT}}

DATOS ESPECÍFICOS DEL EVENTO:
{{EVENT_DATA}}

TU TAREA:
Generar un objeto JSON estructurado que sirva de base para una presentación de 6 slides (más la portada).
El tono debe ser profesional, persuasivo, basado en datos y orientado a ROI y Branding.

FORMATO DE SALIDA (JSON PURO):
{
  "portada": {
    "titulo": "Reporte de Insights: {{EVENT_NAME}}",
    "subtitulo": "Análisis Estratégico de Audiencia y Mercado",
    "fecha": "{{EVENT_DATE}}"
  },
  "slide1": {
    "resumenEjecutivo": "Un resumen de ~500 caracteres sobre los hitos del evento y el valor capturado para las marcas.",
    "kpis": {
        "asistentes": "{{TOTAL_REGISTRATIONS}}",
        "gamaPromedio": "Calcula y nombra la gama predominante (ej: Media-Alta) basándote en los datos de activos.",
        "valorPatrimonial": "{{TOTAL_ASSET_VALUE}}"
    }
  },
  "slide2": {
    "analisisDemografico": "Análisis de ~600 caracteres sobre Género, Edad y Perfiles Generacionales detectados. Cruza los datos del evento con el 'Contexto Estratégico' provisto (Gen Z, Millennials, etc.). Explica por qué este perfil es valioso para un patrocinador."
  },
  "slide3": {
    "perfilCiclista": "Análisis de ~600 caracteres sobre el comportamiento del ciclista según su Tier (Gama). Menciona equipamiento probable, marcas de referencia, motivadores de compra e inversión promedio estimada en equipo adicional."
  },
  "slide4": {
    "cuotaMercado": "Análisis de ~600 caracteres sobre las marcas presentes en el evento. Identifica tendencias de fidelidad de marca y oportunidades de conquista de mercado para el patrocinador."
  },
  "slide5": {
    "valuacionInventario": "Análisis de ~600 caracteres sobre la calidad del parque vehicular (bicicletas) presente. Relaciona el valor de las bicicletas con el poder adquisitivo y el estilo de vida de los participantes."
  },
  "slide6": {
    "recomendaciones": [
      "Recomendación estratégica 1 para la marca",
      "Recomendación estratégica 2 para la marca",
      "Recomendación estratégica 3 para la marca",
      "Recomendación estratégica 4 para la marca",
      "Recomendación estratégica 5 para la marca",
      "Recomendación estratégica 6 para la marca"
    ]
  }
}

REGLAS:
1. Usa los datos del mercado mexicano provistos para enriquecer el análisis (ej. si hay muchos Millennials, menciona su rol como núcleo productivo).
2. Los textos deben tener la profundidad suficiente para ser leídos en una slide profesional (12pt).
3. No inventes números que no estén en los datos del evento.
`;

export async function generateEventSponsorReport(eventData: any, eventName: string, eventDate: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const user = await getAuthenticatedUser();
        if (!user || (user.role !== 'admin' && user.role !== 'ong')) {
            throw new Error('No autorizado.');
        }

        // Sanitización y preparación de datos para la IA
        const cleanData = {
            participantes: {
                total: eventData.general.totalRegistrations,
                asistenciaReal: eventData.general.checkedInCount,
                edadPromedio: eventData.general.averageAge,
                generos: eventData.general.genderDistribution,
                generaciones: eventData.general.generationsDistribution
            },
            activos: {
                valorTotalMXN: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(eventData.market.totalAssetValue),
                valorPromedioMXN: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(eventData.market.averageAssetValue),
                distribucionGamas: eventData.market.rangesDistribution
            },
            marcas: {
                top10: eventData.market.topBrands
            }
        };

        const prompt = SPONSOR_REPORT_PROMPT_TEMPLATE
            .replace('{{MARKET_CONTEXT}}', JSON.stringify(MEXICO_CYCLING_MARKET_REPORT))
            .replace('{{EVENT_DATA}}', JSON.stringify(cleanData))
            .replace('{{EVENT_NAME}}', eventName)
            .replace('{{EVENT_DATE}}', eventDate)
            .replace('{{TOTAL_REGISTRATIONS}}', eventData.general.totalRegistrations.toString())
            .replace('{{TOTAL_ASSET_VALUE}}', cleanData.activos.valorTotalMXN);

        const response = await ai.generate({
            model: 'googleai/gemini-3.1-flash-lite-preview',
            prompt: prompt,
            config: {
                temperature: 0.5,
                responseMimeType: 'application/json'
            }
        });

        return { 
            success: true, 
            data: JSON.parse(response.text) 
        };

    } catch (error: any) {
        console.error("AI Sponsor Report Generation Error:", error);
        return { success: false, error: 'Ocurrió un error al procesar el análisis estratégico.' };
    }
}
