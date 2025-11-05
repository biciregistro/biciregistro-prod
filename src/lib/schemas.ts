import { z } from "zod";

// --- Unified Schema for User Form (Signup and Profile) ---
// This single schema defines the shape of the form and uses superRefine
// to apply conditional validation logic for signup vs. profile editing.
export const userFormSchema = z.object({
    id: z.string().optional(), // Presence of ID indicates editing mode
    name: z.string().min(2, "El nombre es obligatorio."),
    lastName: z.string().min(2, "Los apellidos son obligatorios."),
    email: z.string().email("El correo electrónico no es válido."),

    // Password fields are optional at the base level.
    // .superRefine will enforce them conditionally for signup or password change.
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),

    // Optional profile fields
    birthDate: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    gender: z.enum(['masculino', 'femenino', 'otro']).optional(),
    postalCode: z.string().optional(),
    whatsapp: z.string().optional(),

}).superRefine((data, ctx) => {
    const isEditing = !!data.id;

    if (isEditing) {
        // --- Profile fields validation (Granular & Partial Updates Allowed) ---
        // Validate the format of each field ONLY if a value is provided.
        // This allows users to update their profile incrementally and receive
        // specific error messages for the fields they are editing.

        // Validate Birth Date format
        if (data.birthDate && !/^\d{2}\/\d{2}\/\d{4}$/.test(data.birthDate)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El formato debe ser DD/MM/AAAA.', path: ['birthDate'] });
        }

        // Validate Postal Code format (must be numeric)
        if (data.postalCode && !/^\d+$/.test(data.postalCode)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El código postal solo debe contener números.', path: ['postalCode'] });
        }

        // Validate WhatsApp format (must be numeric)
        if (data.whatsapp && !/^\d+$/.test(data.whatsapp)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El WhatsApp solo debe contener números.', path: ['whatsapp'] });
        }

        // --- Password change validation (only runs if newPassword field is filled) ---
        if (data.newPassword) {
            if (!data.currentPassword) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Debes ingresar tu contraseña actual para cambiarla.', path: ['currentPassword'] });
            }
            if (data.newPassword.length < 6) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La nueva contraseña debe tener al menos 6 caracteres.', path: ['newPassword'] });
            }
            if (data.newPassword !== data.confirmPassword) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Las nuevas contraseñas no coinciden.', path: ['confirmPassword'] });
            }
        }
    } else {
        // --- Signup Validations ---
        if (!data.password) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La contraseña es obligatoria.', path: ['password'] });
        } else {
            if (data.password.length < 6) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La contraseña debe tener al menos 6 caracteres.', path: ['password'] });
            }
            if (!/[A-Z]/.test(data.password)) {
                 ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La contraseña debe tener al menos una letra mayúscula.', path: ['password'] });
            }
            if (!/[a-z]/.test(data.password)) {
                 ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La contraseña debe tener al menos una letra minúscula.', path: ['password'] });
            }
            if (!/[0-9]/.test(data.password)) {
                 ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La contraseña debe tener al menos un número.', path: ['password'] });
            }
            if (!/[!@#$&*]/.test(data.password)) {
                 ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La contraseña debe tener al menos un carácter especial (!, @, #, $, &, *).', path: ['password'] });
            }
            if (data.password !== data.confirmPassword) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Las contraseñas no coinciden.', path: ['confirmPassword'] });
            }
        }
    }
});
