'use server';

import { getAuthenticatedUser } from '@/lib/data';
import { ai } from '@/ai/genkit';
import { getQualitativeSecurityData } from '@/lib/analytics-data';
import type { DashboardFilters } from '@/lib/types';

const MO_PROMPT_TEMPLATE = `
Actúa como un Analista de Inteligencia Criminal especializado en robos urbanos. Tu objetivo es analizar narrativas crudas de robos de bicicletas e identificar patrones operativos (Modus Operandi).

A continuación se te proporcionan las descripciones de los robos filtrados bajo el contexto: {{FILTERS}}.
Si no hay filtros específicos, asume que es un análisis global.

Fecha del reporte: {{DATE}}

Datos crudos (Descripciones de los robos):
\`\`\`
{{DATA}}
\`\`\`

Instrucciones Críticas:
1. Lee y analiza todas las descripciones. Agrupa los robos que compartan características similares.
2. Calcula un porcentaje estimado de incidencia para cada Modus Operandi (M.O.) identificado.
3. Para cada M.O., describe brevemente cómo operan los ladrones.
4. El tono debe ser profesional, objetivo y gubernamental/policial.
5. NO inventes datos. Si las narrativas son vagas, agrúpalas como "Oportunidad / Sin especificar".
6. Devuelve ÚNICAMENTE el reporte en Markdown. NO incluyas introducciones conversacionales como "Claro, aquí tienes el reporte" o "Procedo con el análisis". Comienza directamente con el título del reporte en Markdown e incluye la Fecha del reporte.
`;

const THIEF_PROFILE_PROMPT_TEMPLATE = `
Actúa como un Perfilador Criminal especializado en delitos urbanos. Tu objetivo es extraer características, patrones físicos y de comportamiento a partir de testimonios de víctimas de robo de bicicletas.

A continuación se te proporcionan las descripciones de los sospechosos o atacantes filtrados bajo el contexto: {{FILTERS}}.
Si no hay filtros específicos, asume que es un análisis global.

Fecha del reporte: {{DATE}}

Datos crudos (Descripciones de los ladrones/vehículos):
\`\`\`
{{DATA}}
\`\`\`

Instrucciones Críticas:
1. Extrae y agrupa características físicas recurrentes, vestimenta, número de atacantes y vehículos de huida.
2. Crea un informe estructurado que perfile los tipos de delincuentes más comunes.
3. El tono debe ser profesional, objetivo y forense.
4. Si no hay suficientes detalles, indica que la información cualitativa es limitada.
5. Devuelve ÚNICAMENTE el reporte en Markdown. NO incluyas introducciones conversacionales como "Claro, procedo con el análisis" o "Aquí está el perfil". Comienza directamente con el título del reporte en Markdown e incluye la Fecha del reporte.
`;

function buildFilterContextString(filters: DashboardFilters): string {
    const parts = [];
    if (filters.country) parts.push(`País: ${filters.country}`);
    if (filters.state) parts.push(`Estado: ${filters.state}`);
    if (filters.city) parts.push(`Ciudad: ${filters.city}`);
    if (filters.modality) parts.push(`Modalidad de Bici: ${filters.modality}`);
    
    return parts.length > 0 ? parts.join(', ') : 'Panorama Global';
}

function getCurrentDateString(): string {
    const today = new Date();
    return today.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

export async function generateMOAnalysis(filters: DashboardFilters): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            throw new Error('No autorizado.');
        }

        const rawData = await getQualitativeSecurityData(filters);
        const theftDetails = rawData
            .map(item => item.details)
            .filter(detail => detail && detail.trim().length > 5);

        if (theftDetails.length === 0) {
            return { success: true, data: "No hay suficientes descripciones de robos en este filtro para generar un análisis." };
        }

        const filterContext = buildFilterContextString(filters);
        const prompt = MO_PROMPT_TEMPLATE
            .replace('{{FILTERS}}', filterContext)
            .replace('{{DATE}}', getCurrentDateString())
            .replace('{{DATA}}', theftDetails.join('\n---\n'));

        const response = await ai.generate({
            model: 'googleai/gemini-2.5-pro', 
            prompt: prompt,
            config: {
                temperature: 0.3,
            }
        });

        // Limpieza adicional de seguridad por si la IA ignora la instrucción
        let cleanText = response.text || '';
        cleanText = cleanText.replace(/^(Claro,? .*?|Procedo con .*?|Aquí tienes .*?|A continuación .*?)\n+/i, '');

        return { 
            success: true, 
            data: cleanText.trim()
        };

    } catch (error: any) {
        console.error("AI Generation Error (MO):", error);
        return { success: false, error: 'Ocurrió un error al procesar el análisis con Inteligencia Artificial.' };
    }
}

export async function generateThiefProfile(filters: DashboardFilters): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'admin') {
            throw new Error('No autorizado.');
        }

        const rawData = await getQualitativeSecurityData(filters);
        const thiefDetails = rawData
            .map(item => item.thiefDetails)
            .filter(detail => detail && detail.trim().length > 5);

        if (thiefDetails.length === 0) {
            return { success: true, data: "No hay suficientes descripciones de sospechosos en este filtro para generar un perfil." };
        }

        const filterContext = buildFilterContextString(filters);
        const prompt = THIEF_PROFILE_PROMPT_TEMPLATE
            .replace('{{FILTERS}}', filterContext)
            .replace('{{DATE}}', getCurrentDateString())
            .replace('{{DATA}}', thiefDetails.join('\n---\n'));

        const response = await ai.generate({
            model: 'googleai/gemini-2.5-pro',
            prompt: prompt,
            config: {
                temperature: 0.3,
            }
        });

        // Limpieza adicional de seguridad por si la IA ignora la instrucción
        let cleanText = response.text || '';
        cleanText = cleanText.replace(/^(Claro,? .*?|Procedo con .*?|Aquí tienes .*?|A continuación .*?)\n+/i, '');

        return { 
            success: true, 
            data: cleanText.trim()
        };

    } catch (error: any) {
        console.error("AI Generation Error (Thief Profile):", error);
        return { success: false, error: 'Ocurrió un error al procesar el análisis con Inteligencia Artificial.' };
    }
}
