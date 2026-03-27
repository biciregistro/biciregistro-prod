'use server';

import { getAuthenticatedUser } from '@/lib/data';
import { ai } from '@/ai/genkit'; 

const REPORT_PROMPT_TEMPLATE = `
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

export async function generateExecutiveSummary(dashboardData: any, filterContext: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            throw new Error('No autorizado.');
        }

        const cleanData = {
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
            }
        };

        const prompt = REPORT_PROMPT_TEMPLATE
            .replace('{{FILTERS}}', filterContext || 'Panorama Global')
            .replace('{{DATA}}', JSON.stringify(cleanData));

        const response = await ai.generate({
            model: 'googleai/gemini-3.1-flash-lite-preview',
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
        return { success: false, error: 'Ocurrió un error al procesar el análisis con Sprock.' };
    }
}
