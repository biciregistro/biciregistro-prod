'use server';

import { ai } from '@/ai/genkit';

// --- Actions de IA ---

export async function validateInvoiceWithAIAction(fileUrl: string, bikeContext: any) {
  try {
    const prompt = `
    You are Sprock, an expert AI specialized in B2B/B2C commercial document validation for a cycling platform. Your role is to act as an anti-fraud firewall.
    
    TASK: Verify if the attached document (image/pdf) is a valid proof of purchase (invoice, ticket, receipt, boleta) for a complete bicycle.
    
    CONTEXT: The user claims this document belongs to a bicycle in their garage with the following details:
    - Brand: ${bikeContext.make}
    - Model: ${bikeContext.model}
    - Serial Number: ${bikeContext.serialNumber || 'Not provided'}
    
    VALIDATION RULES:
    1. Structural (isInvoice): It must be a commercial transaction document. Look for keywords like "Factura", "Invoice", "Ticket de compra", "Comprobante", "Nota de venta".
    2. Semantic (hasBicycle): The primary item sold MUST be a complete bicycle (Bicicleta, Bici, E-Bike, MTB, Ruta, Gravel, Frameset). If the document ONLY lists parts, accessories, helmets, tires, or service, it MUST fail.
    3. Consistency: The brand and model in the document must match or have a high semantic similarity with the CONTEXT provided (e.g., "Specialized Stumpjumper" matches "Stumpy", "Trek Marlin 7" matches "Marlin Siete").
    4. Serial Number: If a serial number is printed on the document, compare it. Note: The absence of a serial number in the document is normal and MUST NOT automatically trigger a rejection. However, if a serial number IS present and does NOT match the context at all, you may flag it. If it reads a random string of numbers that doesn't look like a serial number, ignore it. Do NOT reject solely because the serial number is missing or unreadable.
    5. Final Decision (isValid): Must be true ONLY if isInvoice is true, hasBicycle is true, and the brand/model are consistent.
    
    OUTPUT FORMAT:
    Return a STRICT JSON object that matches exactly this schema, with no markdown formatting (\` \`\`\`json \`) or extra text before or after:
    {
      "isValid": boolean, // true if the document fully validates the bicycle purchase
      "isInvoice": boolean, // true if it has a valid commercial structure
      "hasBicycle": boolean, // true if a complete bicycle is listed
      "rejectionReason": "NOT_AN_INVOICE" | "NO_BICYCLE_FOUND" | "BRAND_MISMATCH" | "SUSPICIOUS_DOCUMENT" | null,
      "summaryExplanation": string // IN SPANISH. If isValid is true, a brief success message. If false, a clear, friendly explanation for the user on why it failed.
    }
    `;
    
    const responseFile = await fetch(fileUrl);
    const arrayBuffer = await responseFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Str = buffer.toString('base64');
    const contentType = responseFile.headers.get('content-type') || 'application/pdf';

    const { text } = await ai.generate({
      prompt: [
        { text: prompt },
        { media: { url: `data:${contentType};base64,${base64Str}`, contentType } }
      ],
      config: {
         temperature: 0.1,
      }
    });

    console.log("AI Invoice Validation Response:", text);

    let data: any = { isValid: false, summaryExplanation: "Error procesando la respuesta." };
    
    if (text) {
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                data = JSON.parse(jsonMatch[0]);
            } else {
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                data = JSON.parse(cleanText);
            }
        } catch (e) {
            console.warn("JSON Parse warning", text);
            return { success: false, error: "No se pudo interpretar la respuesta de la IA" };
        }
    } else {
        return { success: false, error: "La IA no devolvió respuesta" };
    }

    if (!data.isValid) {
        return { success: false, error: data.summaryExplanation };
    }

    return { success: true, message: data.summaryExplanation };

  } catch (error: any) {
    console.error("AI Validation Error:", error);
    return { success: false, error: "Ocurrió un error al analizar el documento con inteligencia artificial. Intenta de nuevo más tarde." };
  }
}

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
    
    // Validación mejorada anti-alucinaciones
    // 1. Si está vacío
    // 2. Si es absurdamente largo (un serial > 25 chars es extremadamente raro, > 40 es seguro basura o explicación)
    // 3. Si contiene patrones de frases de la IA comprimidas
    const invalidPatterns = ["BASEDON", "CANNOT", "UNABLETO", "SORRY", "IAMUNABLE", "ICANT", "IMAGE", "DETECT"];
    const isHallucination = invalidPatterns.some(pattern => cleanSerial.includes(pattern));

    if (!cleanSerial || cleanSerial.length > 30 || isHallucination) {
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
