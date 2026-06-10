"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminDb as db } from "@/lib/firebase/server";
import { getAuthenticatedUser } from "@/lib/data";
import { SerialBibService } from "./serial-bib-service";
import type { Serial, EventCategory } from "@/lib/types";

// Schema para las categorías (Mismo usado en los eventos normales)
// Coercionamos minAge y maxAge para evitar problemas de tipos de string vacío
const categorySchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "El nombre es obligatorio"),
    description: z.string().optional(),
    ageConfig: z.object({
        isRestricted: z.boolean(),
        minAge: z.preprocess(
            (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
            z.number().optional()
        ),
        maxAge: z.preprocess(
            (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
            z.number().optional()
        )
    }).optional(),
    startTime: z.string().optional()
});

// Schema para la creación validada del Serial
// Coercionamos price para que maneje strings numéricos de inputs HTML
const serialStagesSchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
  price: z.coerce.number().min(0, "El precio debe ser válido"),
});

const createSerialSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  slug: z.string().min(3, "El slug es obligatorio"),
  description: z.string().min(10, "La descripción es muy corta"),
  country: z.string().min(2, "País requerido"),
  state: z.string().min(2, "Estado requerido"),
  guideUrl: z.string().url("Debe ser una URL válida (PDF)").optional().or(z.literal('')),
  
  // Nuevos campos de herencia
  modality: z.string().min(2, "Selecciona una modalidad base"),
  level: z.enum(['Principiante', 'Intermedio', 'Avanzado']).default('Intermedio'),
  categories: z.array(categorySchema).min(1, "Debes configurar al menos 1 categoría global"),
  
  maxParticipantsGlobal: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
      z.number().optional()
  ),
  requiresAffiliationId: z.boolean().default(false),
  stages: z.array(serialStagesSchema).min(1, "Debe tener al menos 1 etapa"),
});

export type CreateSerialPayload = z.infer<typeof createSerialSchema>;

export async function createSerialWithStagesAction(payload: CreateSerialPayload) {
  const user = await getAuthenticatedUser();
  
  if (!user || user.role !== 'ong') {
    return { success: false, error: "No tienes permisos para realizar esta acción." };
  }

  // 1. Validate payload via Zod
  const validatedFields = createSerialSchema.safeParse(payload);
  
  if (!validatedFields.success) {
      return { 
          success: false, 
          error: "Datos inválidos", 
          details: validatedFields.error.format() // Mejor visualización de errores anidados en la consola
      };
  }

  const { stages, categories, modality, level, ...serialData } = validatedFields.data;

  try {
    const serialId = db.collection('serials').doc().id;
    const batch = db.batch();

    // 2. Crear la entidad Wrapper (Serial)
    const serialRef = db.collection('serials').doc(serialId);
    
    // Matriz de puntos predeterminada para el MVP (hasta 10mo lugar)
    const defaultPointMatrix = [
        { position: 1, points: 100 },
        { position: 2, points: 80 },
        { position: 3, points: 60 },
        { position: 4, points: 50 },
        { position: 5, points: 40 },
        { position: 6, points: 30 },
        { position: 7, points: 25 },
        { position: 8, points: 20 },
        { position: 9, points: 15 },
        { position: 10, points: 10 },
    ];

    const serialDoc: Serial = {
        ...serialData,
        id: serialId,
        ongId: user.id,
        status: 'published',
        pointMatrix: defaultPointMatrix,
        categories: categories as EventCategory[], // Guardamos las categorías en el objeto padre para referencia
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    batch.set(serialRef, serialDoc);

    // 3. Crear los eventos hijos iterando sobre los stages
    stages.forEach((stage, index) => {
        const stageId = db.collection('events').doc().id;
        const stageRef = db.collection('events').doc(stageId);
        
        const stageOrder = index + 1;
        const eventName = `Fecha ${stageOrder} - ${serialData.name}`;

        // Construir entidad Event inyectada
        const eventDoc = {
            id: stageId,
            ongId: user.id,
            status: 'draft', // Por defecto se crean como borrador para revisión
            name: eventName,
            eventType: 'Competencia', // Los seriales son inherentemente competencias
            date: stage.date,
            country: serialData.country,
            state: serialData.state,
            description: serialData.description,
            
            // --- HERENCIA ESTRICTA DESDE EL SERIAL WIZARD ---
            modality: modality,
            level: level,
            hasCategories: true,
            categories: categories as EventCategory[], 
            
            // Requerimientos Base Estrictos (Solicitado por el PO)
            requiresEmergencyContact: true,
            requiresBike: true, 
            requiresWaiver: true, 
            
            // Configuración Base de Placas Habilitada por Defecto
            bibNumberConfig: {
                enabled: true,
                mode: 'automatic',
                nextNumber: 1
            },

            // Financials (Simplificado para el MVP)
            costType: stage.price > 0 ? 'Con Costo' : 'Gratuito',
            costTiers: [{
                id: db.collection('dummy').doc().id,
                name: 'Inscripción General',
                price: stage.price,
                includes: 'Acceso a la etapa, cronometraje e hidratación',
            }],

            // Inyección quirúrgica del Serial Engine
            serialId: serialId,
            isSerialStage: true,
            stageOrder: stageOrder,
        };

        batch.set(stageRef, eventDoc);
    });

    // 4. Inicializar el contador global del Serial
    const counterRef = db.collection('serial_bib_counters').doc(serialId);
    batch.set(counterRef, { currentNumber: 0 });

    // 5. Ejecutar transacción
    await batch.commit();

    revalidatePath('/dashboard/ong');
    
    return { success: true, serialId };

  } catch (error) {
      console.error("Error creating serial:", error);
      return { success: false, error: "Ocurrió un error al persistir el campeonato." };
  }
}
