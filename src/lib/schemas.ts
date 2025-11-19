import { z } from "zod";

const passwordSchema = z.string()
    .min(6, "La contraseña debe tener al menos 6 caracteres.")
    .regex(/[A-Z]/, "La contraseña debe tener al menos una letra mayúscula.")
    .regex(/[0-9]/, "La contraseña debe tener al menos un número.")
    .regex(/[!@#$&*]/, "La contraseña debe tener al menos un carácter especial (!@#$&*).");
    
// --- Unified Schema for User Form (Signup and Profile Update) ---
// This schema defines all possible fields and uses .superRefine for conditional validation.
export const userFormSchema = z.object({
    // --- Core fields ---
    id: z.string().optional(), // Presence of ID indicates editing mode
    name: z.string().min(2, "El nombre es obligatorio."),
    lastName: z.string().min(2, "Los apellidos son obligatorios."),
    // Email is optional at the base level; superRefine will enforce it for signup.
    email: z.string().email("El correo electrónico no es válido.").optional(),

    // --- Optional profile fields ---
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    birthDate: z.string().optional(),
    state: z.string().optional(),
    // Ensures gender matches the specific allowed values, or is undefined.
    gender: z.enum(["masculino", "femenino", "otro"]).optional(),
    postalCode: z.string().optional(),
    whatsapp: z.string().optional(),

    // --- Password fields ---
    // Optional at the base level; superRefine will enforce them conditionally.
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),

}).superRefine((data, ctx) => {
    // --- SCENARIO 1: SIGNUP (No ID present) ---
    // Email, Password, and Confirm Password are required and must be valid.
    if (!data.id) {
        if (!data.email) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El correo electrónico es obligatorio.",
                path: ["email"],
            });
        }
        if (!data.password) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "La contraseña es obligatoria.",
                path: ["password"],
            });
        } else {
            const validation = passwordSchema.safeParse(data.password);
            if (!validation.success) {
                validation.error.issues.forEach(issue => {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: issue.message,
                        path: ["password"],
                    });
                });
            }
        }
        if (data.password !== data.confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Las contraseñas no coinciden.",
                path: ["confirmPassword"],
            });
        }
    }

    // --- SCENARIO 2: PROFILE EDIT (ID is present) ---
    // This logic handles the optional password change.
    const { currentPassword, newPassword, confirmPassword } = data;
    const isAttemptingPasswordChange = currentPassword || newPassword || confirmPassword;

    // If the user types in any of the password fields, all become required.
    if (data.id && isAttemptingPasswordChange) {
        if (!currentPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "La contraseña actual es obligatoria para cambiarla.",
                path: ["currentPassword"],
            });
        }
        if (!newPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "La nueva contraseña es obligatoria.",
                path: ["newPassword"],
            });
        } else {
            const validation = passwordSchema.safeParse(newPassword);
            if (!validation.success) {
                validation.error.issues.forEach(issue => {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: issue.message,
                        path: ["newPassword"],
                    });
                });
            }
        }
        if (newPassword !== confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Las nuevas contraseñas no coinciden.",
                path: ["confirmPassword"],
            });
        }
    }
    // If no password fields are filled, superRefine does nothing, and validation passes for them.
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
