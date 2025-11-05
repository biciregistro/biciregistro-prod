import { z } from "zod";

// --- Unified Schema for User Form (Signup and Profile Update) ---
// This schema defines all possible fields and uses .superRefine for conditional validation.
export const userFormSchema = z.object({
    // --- Core fields ---
    id: z.string().optional(), // Presence of ID indicates editing mode
    name: z.string().min(2, "El nombre es obligatorio."),
    lastName: z.string().min(2, "Los apellidos son obligatorios."),
    email: z.string().email("El correo electrónico no es válido."),

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
    password: z.string().optional(), // Represents "new password" in edit mode
    confirmPassword: z.string().optional(),
    currentPassword: z.string().optional(),

}).superRefine((data, ctx) => {
    // --- SCENARIO 1: SIGNUP (No ID present) ---
    // Password and Confirm Password are required and must be valid.
    if (!data.id) {
        if (!data.password) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "La contraseña es obligatoria.",
                path: ["password"],
            });
        } else if (data.password.length < 6) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "La contraseña debe tener al menos 6 caracteres.",
                path: ["password"],
            });
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
    const { currentPassword, password, confirmPassword } = data;
    const isAttemptingPasswordChange = currentPassword || password || confirmPassword;

    // If the user types in any of the password fields, all become required.
    if (isAttemptingPasswordChange) {
        if (!currentPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "La contraseña actual es obligatoria para cambiarla.",
                path: ["currentPassword"],
            });
        }
        if (!password) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "La nueva contraseña es obligatoria.",
                path: ["password"],
            });
        } else if (password.length < 6) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "La nueva contraseña debe tener al menos 6 caracteres.",
                path: ["password"],
            });
        }
        if (password !== confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Las nuevas contraseñas no coinciden.",
                path: ["confirmPassword"],
            });
        }
    }
    // If no password fields are filled, superRefine does nothing, and validation passes for them.
});
