'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { adminDb } from '@/lib/firebase/server';
import { getDecodedSession } from '@/lib/auth';
import { validateSerialNumberAction } from '@/lib/actions/bike-actions';
import crypto from 'crypto';

// 1. Esquema estructurado para obligar a Gemini a devolver el formato exacto
const BulkInventorySchema = z.object({
  bikes: z.array(z.object({
    marca: z.string().describe("Marca explícita o deducida (ej. Trek, Specialized)"),
    modelo: z.string().describe("Nombre del modelo de la bicicleta"),
    color: z.string().describe("Color principal. Usa 'No especificado' si no lo encuentras."),
    numeroSerie: z.string().describe("Número de serie alfanumérico del cuadro. Vacío si no se encuentra."),
    anoModelo: z.string().describe("Año de fabricación o modelo. Si no se menciona, calcula o deja 'No especificado'"),
    modalidad: z.string().describe("Tipo de bicicleta. Ej: MTB, Ruta, Urbana, Gravel, Eléctrica."),
    precioEstimado: z.number().describe("Precio de venta, MSRP o costo en formato numérico (sin signos). 0 si no existe.")
  }))
});

export type ParsedInventoryBike = z.infer<typeof BulkInventorySchema>['bikes'][0];

/**
 * Procesa un archivo (Texto, PDF o Imagen) y extrae las bicicletas usando IA.
 */
export async function parseMultimodalInventoryAction(
  payload: { data: string; mimeType: string; isText: boolean }
): Promise<{ success: boolean; data?: ParsedInventoryBike[]; error?: string }> {
  
  const session = await getDecodedSession();
  if (!session?.uid || session.role !== 'ong') {
      return { success: false, error: 'No tienes permisos para realizar esta acción.' };
  }

  try {
    const promptMessage = `
      Eres el Asistente Experto en Inventario B2B de BiciRegistro.
      A continuación te proveo el contenido de un inventario (puede ser texto plano de un CSV/Excel, o una imagen/PDF de una factura).
      Tu trabajo es analizar el contenido, extraer TODAS las bicicletas mencionadas y estructurarlas en el formato JSON solicitado.
      
      REGLAS DE ORO:
      1. Extrae solo bicicletas. Ignora accesorios, cascos, refacciones o servicios.
      2. Si el modelo implica una marca evidente pero no está escrita (Ej. Modelo "Marlin 7"), asume la marca ("Trek").
      3. Si el color, serie o precio faltan, no los inventes, déjalos vacíos o en 0 según el esquema.
    `;

    // Si es texto (CSV/Texto plano)
    if (payload.isText) {
      const response = await ai.generate({
        // Usamos el modelo por defecto definido en genkit.ts
        prompt: `${promptMessage}\n\nCONTENIDO DEL INVENTARIO:\n${payload.data}`,
        output: { schema: BulkInventorySchema },
        config: { temperature: 0.1 }
      });
      return { success: true, data: response.output?.bikes || [] };
    } 
    
    // Si es Media (Imagen, PDF Base64)
    else {
      // Remover el prefijo "data:image/jpeg;base64," si existe para la API de Genkit
      const base64Data = payload.data.includes(',') ? payload.data.split(',')[1] : payload.data;

      const response = await ai.generate({
        // Usamos el modelo por defecto definido en genkit.ts
        prompt: promptMessage,
        messages: [
          {
            role: 'user',
            content: [
              { text: promptMessage },
              { media: { url: `data:${payload.mimeType};base64,${base64Data}`, contentType: payload.mimeType } }
            ]
          }
        ],
        output: { schema: BulkInventorySchema },
        config: { temperature: 0.1 }
      });
      return { success: true, data: response.output?.bikes || [] };
    }

  } catch (error: any) {
    console.error("[parseMultimodalInventoryAction] Error:", error);
    return { success: false, error: 'No se pudo procesar el archivo. Intenta con un formato más claro o en lotes más pequeños.' };
  }
}

/**
 * Guarda las bicicletas validadas en Firestore usando un Batch Write
 */
export async function registerBulkBikesAction(bikesArray: ParsedInventoryBike[]): Promise<{ success: boolean; count?: number; error?: string }> {
  const session = await getDecodedSession();
  if (!session?.uid || session.role !== 'ong') {
      return { success: false, error: 'No tienes permisos para realizar esta acción.' };
  }

  const batch = adminDb.batch();
  const bikesCollection = adminDb.collection('bikes');
  let registeredCount = 0;

  try {
    for (const bike of bikesArray) {
      // 1. Validar que el número de serie no esté vacío y no exista previamente
      if (bike.numeroSerie && bike.numeroSerie.trim() !== '' && bike.numeroSerie.toLowerCase() !== 'no especificado') {
        const check = await validateSerialNumberAction(bike.numeroSerie);
        if (check.exists) {
           console.warn(`Serie ${bike.numeroSerie} duplicada, saltando registro en lote.`);
           continue; 
        }
      }

      // 2. Preparar el documento
      const newBikeRef = bikesCollection.doc();
      batch.set(newBikeRef, {
        userId: session.uid,
        status: 'inventory', // Estado crucial B2B
        make: bike.marca,
        model: bike.modelo,
        color: bike.color,
        modality: bike.modalidad,
        serialNumber: bike.numeroSerie || `PENDING_BULK_${crypto.randomUUID().substring(0,8)}`,
        modelYear: bike.anoModelo,
        appraisedValue: bike.precioEstimado || 0,
        photos: [], // Sin foto por ser inventario
        registrationIp: 'bulk_upload',
        createdAt: new Date().toISOString()
      });
      
      registeredCount++;
    }

    if (registeredCount > 0) {
      await batch.commit();
    }

    return { success: true, count: registeredCount };

  } catch (error) {
    console.error("[registerBulkBikesAction] Error:", error);
    return { success: false, error: 'Error de base de datos al guardar el inventario.' };
  }
}
