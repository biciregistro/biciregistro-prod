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
    city: z.string().optional(), // Relaxed validation to allow empty strings during signup
    country: z.string().optional(),
    birthDate: z.string().optional(),
    state: z.string().optional(),
    gender: z.enum(["masculino", "femenino", "otro"]).optional(),
    postalCode: z.string().optional(),
    whatsapp: z.string().optional(),
    
    // Notification Preferences
    notificationsSafety: z.coerce.boolean().optional(),
    notificationsMarketing: z.coerce.boolean().optional(),

    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
}).superRefine((data, ctx) => {
    // ... logic
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

// --- Schema for ONG Profile Editing ---
export const ongProfileSchema = z.object({
    organizationName: z.string().min(3, "El nombre de la organización es obligatorio."),
    contactPerson: z.string().min(3, "El nombre de la persona de contacto es obligatorio."),
    organizationWhatsapp: z.string().min(10, "El número de WhatsApp de la organización es obligatorio."),
    contactWhatsapp: z.string().min(10, "El número de WhatsApp del contacto es obligatorio."),
    websiteUrl: z.string().url("El enlace a la página web no es válido.").optional().or(z.literal('')),
    instagramUrl: z.string().url("El enlace a Instagram no es válido.").optional().or(z.literal('')),
    facebookUrl: z.string().url("El enlace a Facebook no es válido.").optional().or(z.literal('')),
    country: z.string().min(1, "El país es obligatorio."),
    state: z.string().min(1, "El estado es obligatorio."),
    logoUrl: z.string().url("La URL del logo no es válida").optional().or(z.literal('')),
    coverUrl: z.string().url("La URL de la portada no es válida").optional().or(z.literal('')),
    description: z.string().max(500, "La descripción no puede exceder los 500 caracteres.").optional(),
});


// New Schema for Financial Data
export const financialProfileSchema = z.object({
    bankName: z.string().min(2, "El nombre del banco es obligatorio."),
    accountHolder: z.string().min(3, "El nombre del beneficiario es obligatorio."),
    clabe: z.string()
        .length(18, "La CLABE debe tener exactamente 18 dígitos.")
        .regex(/^\d+$/, "La CLABE debe contener solo números."),
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
    distance: z.coerce.number().nonnegative("La distancia debe ser un número positivo o cero.").optional(),
    costType: z.enum(['Gratuito', 'Con Costo']).optional(),
    paymentDetails: z.string().optional(),
    
    // Max Participants
    maxParticipants: z.coerce.number().int().positive("El cupo debe ser un número entero positivo.").optional().or(z.literal(0)),

    // Dynamic fields for cost tiers
    costTiers: z.array(z.object({
        id: z.string(),
        name: z.string().min(1, "El nombre del nivel es obligatorio."),
        price: z.coerce.number().positive("El precio debe ser un número positivo."),
        // Nuevos campos opcionales para persistencia financiera
        netPrice: z.coerce.number().optional(),
        fee: z.coerce.number().optional(),
        includes: z.string().min(1, "Debes detallar qué incluye este nivel."),
        absorbFee: z.boolean().optional().default(false), // NUEVO: MVP Comisión Absorbida
    })).optional(),
    
    // Categories
    hasCategories: z.boolean().optional(),
    categories: z.array(z.object({
        id: z.string(),
        name: z.string().min(1, "El nombre de la categoría es obligatorio."),
        description: z.string().optional(),
        ageConfig: z.object({
            isRestricted: z.boolean().default(false),
            minAge: z.coerce.number().optional(),
            maxAge: z.coerce.number().optional(),
        }).optional(),
        startTime: z.string().optional(), // Formato HH:MM
    })).optional(),

    // Registration Deadline
    hasRegistrationDeadline: z.boolean().optional(),
    registrationDeadline: z.string().optional(),

    // Emergency Contact
    requiresEmergencyContact: z.boolean().optional(),

    // Bike Requirement
    requiresBike: z.boolean().optional(),

    // Bib Number Configuration (Moved up)
    bibNumberConfig: z.object({
        enabled: z.boolean(),
        mode: z.enum(['automatic', 'dynamic']),
        nextNumber: z.number().optional()
    }).optional(),

    // Jersey Configuration (New Field)
    hasJersey: z.boolean().optional(),
    jerseyConfigs: z.array(z.object({
        id: z.string(),
        name: z.string().min(1, "El nombre del modelo es obligatorio."),
        type: z.enum(['Enduro', 'XC', 'Ruta'], {
            required_error: "Debes seleccionar un tipo de jersey."
        }),
        sizes: z.array(z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL'])).min(1, "Debes seleccionar al menos una talla.")
    })).optional(),

    // Legal / Waiver Configuration
    requiresWaiver: z.boolean().optional(),
    waiverText: z.string().optional(),

    // Sponsors
    sponsors: z.array(z.string().url()).optional(),
}).superRefine((data, ctx) => {
    // ... refine logic
});

export const financialSettingsSchema = z.object({
    commissionRate: z.coerce.number().min(0).max(100, "El porcentaje debe estar entre 0 y 100."),
    pasarelaRate: z.coerce.number().min(0).max(100, "El porcentaje debe estar entre 0 y 100."),
    pasarelaFixed: z.coerce.number().min(0, "El monto fijo no puede ser negativo."),
    ivaRate: z.coerce.number().min(0).max(100, "El porcentaje de IVA debe estar entre 0 y 100."),
});

// --- Notification Campaign Schema ---
export const notificationCampaignSchema = z.object({
    title: z.string().min(5, "El título debe tener al menos 5 caracteres.").max(100, "El título es demasiado largo."),
    body: z.string().min(10, "El mensaje debe tener al menos 10 caracteres.").max(500, "El mensaje es demasiado largo."),
    link: z.string().url("El link debe ser una URL válida.").optional().or(z.literal('')),
    campaignType: z.enum(['marketing', 'safety']).default('marketing'),
    
    // Filters
    filters: z.object({
        country: z.string().optional(),
        state: z.string().optional(),
        city: z.string().optional(),
        gender: z.string().optional(),
        
        bikeMake: z.string().optional(),
        bikeModality: z.string().optional(),
        
        targetGroup: z.enum(['all', 'with_bike', 'without_bike']).default('all'),
    }),
});

// --- Events Manager Landing Page Schemas ---

const landingEventsHeroSchema = z.object({
    title: z.string().min(10, "El título es muy corto."),
    subtitle: z.string().min(10, "El subtítulo es muy corto."),
    ctaButton: z.string().min(5, "El texto del botón es muy corto."),
    trustCopy: z.string().min(10, "El texto de confianza es muy corto."),
    backgroundImageUrl: z.string().url("La URL de la imagen de fondo no es válida."),
});

const landingEventsPainPointSchema = z.object({
    id: z.string(),
    title: z.string().min(5, "El título es muy corto."),
    description: z.string().min(10, "La descripción es muy corta."),
});

const landingEventsSolutionSchema = z.object({
    id: z.string(),
    title: z.string().min(5, "El título es muy corto."),
    description: z.string().min(10, "La descripción es muy corta."),
});

const landingEventsFeatureSchema = z.object({
    title: z.string().min(10, "El título es muy corto."),
    description: z.string().min(10, "La descripción es muy corta."),
    imageUrl: z.string().url("La URL de la imagen no es válida."),
});

const landingEventsCtaSchema = z.object({
    title: z.string().min(10, "El título es muy corto."),
    description: z.string().min(10, "La descripción es muy corta."),
    ctaButton: z.string().min(5, "El texto del botón es muy corto."),
});

const landingEventsAllySchema = z.object({
    name: z.string().min(3, "El nombre del aliado es muy corto."),
    logoUrl: z.string().url("La URL del logo no es válida."),
});

export const landingEventsContentSchema = z.object({
    hero: landingEventsHeroSchema,
    painPointsSection: z.object({
        title: z.string().min(10, "El título de la sección es muy corto."),
        points: z.tuple([landingEventsPainPointSchema, landingEventsPainPointSchema, landingEventsPainPointSchema]),
    }),
    solutionSection: z.object({
        title: z.string().min(10, "El título de la sección es muy corto."),
        solutions: z.tuple([landingEventsSolutionSchema, landingEventsSolutionSchema, landingEventsSolutionSchema]),
    }),
    featureSection: landingEventsFeatureSchema,
    socialProofSection: z.object({
        // Set default to empty array to satisfy TypeScript non-optional type if value is missing
        allies: z.array(landingEventsAllySchema).optional().default([]),
    }),
    ctaSection: landingEventsCtaSchema,
});
