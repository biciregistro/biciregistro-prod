import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
  // Dejamos el modelo global en 3.1-flash-lite para que todo el sitio 
  // utilice por defecto el modelo de mayor eficiencia en costos.
  model: 'googleai/gemini-3.1-flash-lite',
});