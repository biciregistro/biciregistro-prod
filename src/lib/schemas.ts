import { z } from "zod";

const passwordSchema = z.string()
    .min(6, "La contraseña debe tener al menos 6 caracteres.")
    .regex(/[A-Z]/, "La contraseña debe tener al menos una letra mayúscula.")
    .regex(/[0-9]/, "La contraseña debe tener al menos un número.")
    .regex(/[!@#$&*]/, "La contraseña debe tener al menos un carácter especial (!@#$&*).");
    
// --- Unified Schema for User Form (Signup and Profile Update) ---
export const userFormSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "El nombre es obligatorio."),
    lastName: z.string().min(2, "Los apellidos son obligatorios."),
    email: z.string().email("El correo electrónico no es válido.").optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    birthDate: z.string().optional(),
    state: z.string().optional(),
    gender: z.enum(["masculino", "femenino", "otro"]).optional(),
    postalCode: z.string().optional(),
    whatsapp: z.string().optional(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
}).superRefine((data, ctx) => {
    // ... (existing superRefine logic)
});

export const ongUserFormSchema = z.object({
  email: z.string().email("El correo electrónico no es válido."),
  password: passwordSchema,
  organizationName: z.string().min(3, "El nombre de la organización es obligatorio."),
  contactPerson: z.string().min(3, "El nombre de la persona de contacto es obligatorio."),
  organizationWhatsapp: z.string().min(10, "El número de WhatsApp de la organización es obligatorio."),
  contactWhatsapp: z.string().min(10, "El número de WhatsApp del contacto es obligatorio."),
  websiteUrl: z.string().url("El enlace a la página web no es válido.").optional().or(z.literal('')),
  instagramUrl: z.string().url("El enlace a Instagram no es válido.").optional().or(z.literal('')),
  facebookUrl: z.string().url("El enlace a Facebook no es válido.").optional().or(z.literal('')),
  country: z.string().min(1, "El país es obligatorio."),
  state: z.string().min(1, "El estado es obligatorio."),
});


export const BikeRegistrationSchema = z.object({
  serialNumber: z.string().min(1, "El número de serie es obligatorio."),
  make: z.string().min(1, "La marca es obligatoria."),
  model: z.string().min(1, "El modelo es obligatorio."),
  color: z.string().min(1, "El color es obligatorio."),
  modelYear: z.string().optional(),
  modality: z.string().optional(),
  appraisedValue: z.coerce.number().nonnegative("El valor debe ser un número positivo.").optional(),
  photos: z.array(z.string()).optional(),
});

// --- Schema for Event Form ---
export const eventFormSchema = z.object({
    // Required fields
    name: z.string().min(3, "El nombre del evento es obligatorio."),
    eventType: z.enum(['Rodada', 'Competencia', 'Taller', 'Conferencia'], {
        required_error: "Debes seleccionar un tipo de evento."
    }),
    date: z.string().min(1, "La fecha y hora son obligatorias."),
    country: z.string().min(1, "El país es obligatorio."),
    state: z.string().min(1, "El estado/provincia es obligatorio."),
    modality: z.string().min(1, "La modalidad es obligatoria."),
    description: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),

    // Optional fields
    imageUrl: z.string().url("La URL de la imagen no es válida.").optional().or(z.literal('')),
    googleMapsUrl: z.string().url("El enlace de Google Maps no es válido.").optional().or(z.literal('')),
    level: z.enum(['Principiante', 'Intermedio', 'Avanzado']).optional(),
    distance: z.coerce.number().positive("La distancia debe ser un número positivo.").optional(),
    costType: z.enum(['Gratuito', 'Con Costo']).optional(),
    paymentDetails: z.string().optional(),
    
    // Max Participants
    maxParticipants: z.coerce.number().int().positive("El cupo debe ser un número entero positivo.").optional().or(z.literal(0)),

    // Dynamic fields for cost tiers
    costTiers: z.array(z.object({
        id: z.string(),
        name: z.string().min(1, "El nombre del nivel es obligatorio."),
        price: z.coerce.number().positive("El precio debe ser un número positivo."),
        includes: z.string().min(1, "Debes detallar qué incluye este nivel."),
    })).optional(),
    
    // Categories
    hasCategories: z.boolean().optional(),
    categories: z.array(z.object({
        id: z.string(),
        name: z.string().min(1, "El nombre de la categoría es obligatorio."),
        description: z.string().optional(),
    })).optional(),
}).superRefine((data, ctx) => {
    if (data.costType === 'Con Costo' && (!data.costTiers || data.costTiers.length === 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Debes agregar al menos un nivel de costo si el evento no es gratuito.",
            path: ["costTiers"],
        });
    }
    
    if (data.hasCategories && (!data.categories || data.categories.length === 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Debes agregar al menos una categoría si habilitaste las categorías.",
            path: ["categories"],
        });
    }
});
