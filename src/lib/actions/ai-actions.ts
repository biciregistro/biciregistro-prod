'use server';

import { ai } from '@/ai/genkit';

// --- Actions de IA ---

export async function analyzeSerialNumberAction(imageBase64: string) {
  try {
    const prompt = "Extract ONLY the alphanumeric serial number visible in this image. Return just the string, no other text. If uncertain or unreadable, return empty string.";
    
    const { text } = await ai.generate({
      prompt: [
        { text: prompt },
        { media: { url: imageBase64, contentType: 'image/jpeg' } }
      ]
    });

    const cleanSerial = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    if (!cleanSerial) {
        return { success: false, error: "La IA no detectó texto legible en la imagen." };
    }

    return { success: true, serialNumber: cleanSerial };
  } catch (error: any) {
    console.error("OCR Error Full:", JSON.stringify(error, null, 2));
    return { success: false, error: error.message || "Error de conexión con la IA." };
  }
}

export async function analyzeBikeImageAction(imageBase64: string) {
  try {
    const prompt = `Analyze this bike image to extract details.
    
    1. Brand: Identify the manufacturer (e.g., Trek, Specialized).
    2. Model: Look closely for text on the top tube or rear triangle. Infer the likely model series (e.g., "Marlin", "Rockhopper", "Tarmac"). Even if you can't see the exact version number, provide the series name. Do NOT leave empty unless absolutely no text/shape match is found.
    3. Color: The main color. IMPORTANT: Must be in SPANISH (e.g., 'Negro', 'Azul', 'Verde Lima').

    Return a STRICT JSON object with keys: "brand", "model", "color". 
    Example: {"brand": "Trek", "model": "Marlin", "color": "Rojo"}
    Do not use markdown formatting.`;
    
    const response = await ai.generate({
      prompt: [
        { text: prompt },
        { media: { url: imageBase64, contentType: 'image/jpeg' } }
      ],
      config: {
        safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
        ]
      }
    });

    console.log("AI Vision Response Raw:", JSON.stringify(response, null, 2));

    let data = { brand: '', model: '', color: '' };
    
    if (response && response.text) {
        try {
            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                data = JSON.parse(jsonMatch[0]);
            } else {
                const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
                data = JSON.parse(cleanText);
            }
        } catch (e) {
            console.warn("JSON Parse warning", response.text);
            return { success: false, error: "No se pudo interpretar la respuesta de la IA" };
        }
    } else {
        return { success: false, error: "La IA no devolvió respuesta de texto" };
    }

    if (!data.brand && !data.model && !data.color) {
         return { success: false, error: "La IA no pudo identificar características en la imagen." };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Vision Error:", error);
    return { success: false, error: error.message || "Error analizando la bicicleta." };
  }
}
