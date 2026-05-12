'use server';

import { getAuthenticatedUser } from '@/lib/data';
import { ai } from '@/ai/genkit'; 

const EXECUTIVE_REPORT_PROMPT_TEMPLATE = `
Actúa como un Analista Senior de Estrategia en BiciRegistro. Tu objetivo es transformar datos crudos en una narrativa de negocio de alto nivel para un reporte corporativo de 7 slides.

Se te proporciona un JSON con datos del ecosistema (filtros aplicados: {{FILTERS}}):
\`\`\`json
{{DATA}}
\`\`\`

Tu tarea es generar un reporte estructurado EXACTAMENTE en el siguiente formato JSON:
{
  "titulo": "Un título profesional y descriptivo basado en los filtros (ej: Análisis de Ecosistema: Querétaro 2025)",
  "introduccion": "Un párrafo de aproximadamente 500 caracteres resumiendo el estado general del segmento.",
  "analisisDemografico": "Un análisis de aproximadamente 500 caracteres sobre la distribución de género, edad promedio y concentración geográfica de los usuarios.",
  "analisisGeneracional": "Un análisis profundo de aproximadamente 500 caracteres sobre los perfiles generacionales detectados (Gen Z, Millennials, etc.) y su peso en la comunidad.",
  "analisisMercado": "Un análisis de aproximadamente 500 caracteres sobre el valor patrimonial total del segmento y preferencias de marcas líderes.",
  "analisisSeguridad": "Un análisis de aproximadamente 500 caracteres sobre la salud del ecosistema, comparando robos vs recuperaciones.",
  "conclusiones": [
    "Conclusión estratégica 1",
    "Conclusión estratégica 2",
    "Conclusión estratégica 3"
  ]
}

REGLAS CRÍTICAS:
1. Tono ejecutivo, sofisticado y analítico.
2. Cada bloque de texto debe rondar los 500 caracteres para asegurar profundidad sin saturar el diseño.
3. No inventes datos; cíñete al JSON provisto.
4. Devuelve ÚNICAMENTE el objeto JSON puro.
`;

const MARKETING_REPORT_PROMPT_TEMPLATE = `
Actúa como un Director de Marketing y Patrocinios en BiciRegistro. Tu objetivo es transformar datos crudos del ecosistema ciclista en una presentación persuasiva para marcas, patrocinadores y agencias de publicidad.

Se te proporciona un JSON con datos de nuestra audiencia (filtros aplicados: {{FILTERS}}):
\`\`\`json
{{DATA}}
\`\`\`

Tu tarea es generar un reporte de oportunidades comerciales estructurado EXACTAMENTE en el siguiente formato JSON:
{
  "titulo": "Un título comercial atractivo basado en la audiencia filtrada (ej: Oportunidades de Patrocinio: Ciclistas Urbanos 2025)",
  "perfilAudiencia": "Un párrafo de ~500 caracteres describiendo cómo es este consumidor (edad, género, generación dominante). ¿Cómo se les debe hablar? ¿Qué los motiva?",
  "potencialComercial": "Un análisis de ~500 caracteres sobre el poder adquisitivo de este segmento basándote en el valor de sus bicicletas y las gamas que prefieren. Véndelo como una audiencia premium.",
  "marcasAfines": "Un análisis de ~500 caracteres sobre las marcas líderes que ya consumen y cómo esto representa oportunidades para marcas de accesorios, seguros o lifestyle afines a ese nivel.",
  "oportunidadesCampana": "Un análisis de ~500 caracteres proponiendo qué tipo de campañas digitales o recompensas (gamificación) funcionarían mejor con este segmento según su perfil y comportamiento de seguridad.",
  "conclusionesComerciales": [
    "Acción comercial recomendada 1 (ej: Vender seguros para gama alta)",
    "Acción comercial recomendada 2 (ej: Patrocinadores de lifestyle para Millennials)",
    "Acción comercial recomendada 3 (ej: Estrategia de recuperación de usuarios)"
  ]
}

REGLAS CRÍTICAS:
1. Tono persuasivo, comercial y orientado a ventas (B2B).
2. Enfócate en CÓMO MONETIZAR o ATRAER INVERSIÓN basándote en esta audiencia.
3. Cada bloque de texto debe rondar los 500 caracteres para asegurar profundidad sin saturar el diseño.
4. No inventes datos; cíñete al JSON provisto, pero extrae los insights comerciales de ellos.
5. Devuelve ÚNICAMENTE el objeto JSON puro.
`;

export async function generateExecutiveSummary(dashboardData: any, filterContext: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            throw new Error('No autorizado.');
        }

        const cleanData = getCleanDataForAI(dashboardData);

        const prompt = EXECUTIVE_REPORT_PROMPT_TEMPLATE
            .replace('{{FILTERS}}', filterContext || 'Panorama Global')
            .replace('{{DATA}}', JSON.stringify(cleanData));

        const response = await ai.generate({
            model: 'googleai/gemini-3.1-flash-lite',
            prompt: prompt,
            config: {
                temperature: 0.4,
                responseMimeType: 'application/json'
            }
        });

        return { 
            success: true, 
            data: JSON.parse(response.text) 
        };

    } catch (error: any) {
        console.error("AI Generation Error:", error);
        return { success: false, error: 'Ocurrió un error al procesar el análisis ejecutivo con Sprock.' };
    }
}

export async function generateMarketingSummary(dashboardData: any, filterContext: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            throw new Error('No autorizado.');
        }

        const cleanData = getCleanDataForAI(dashboardData);

        const prompt = MARKETING_REPORT_PROMPT_TEMPLATE
            .replace('{{FILTERS}}', filterContext || 'Audiencia Global')
            .replace('{{DATA}}', JSON.stringify(cleanData));

        const response = await ai.generate({
            model: 'googleai/gemini-3.1-flash-lite',
            prompt: prompt,
            config: {
                temperature: 0.6, // Un poco más creativo para marketing
                responseMimeType: 'application/json'
            }
        });

        return { 
            success: true, 
            data: JSON.parse(response.text) 
        };

    } catch (error: any) {
        console.error("AI Marketing Generation Error:", error);
        return { success: false, error: 'Ocurrió un error al procesar el análisis de marketing con Sprock.' };
    }
}

// Helper function to extract and clean data to avoid exceeding context window limits
function getCleanDataForAI(dashboardData: any) {
    return {
        general: {
            totalUsers: dashboardData.generalStats?.totalUsers,
            totalBikes: dashboardData.generalStats?.totalBikes,
        },
        demografia: {
            edadPromedio: dashboardData.userDemographics?.averageAge,
            genero: dashboardData.userDemographics?.genderDistribution,
            ubicaciones: dashboardData.userDemographics?.topLocations?.slice(0, 3)
        },
        generaciones: dashboardData.userDemographics?.generationsDistribution,
        mercado: {
            valorTotal: dashboardData.marketMetrics?.totalValue,
            topBrands: dashboardData.marketMetrics?.topBrands?.slice(0, 5),
            distribucionGamas: dashboardData.marketMetrics?.rangesDistribution
        },
        seguridad: {
            stolen: dashboardData.statusCounts?.stolen,
            recovered: dashboardData.statusCounts?.recovered,
            topStolen: dashboardData.topBrandsStolen?.slice(0, 3)
        },
        potencialMarketing: {
            contactableUsers: dashboardData.marketingPotential?.contactableUsers,
            porcentajeAlcance: dashboardData.marketingPotential?.percentage
        }
    };
}
