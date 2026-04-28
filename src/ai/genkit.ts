import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
  // Dejamos el modelo global en 3.1-flash-lite-preview para que todo el sitio 
  // (incluyendo el Wizard) herede el modelo que tiene cuota.
  model: 'googleai/gemini-3.1-flash-lite-preview',
});