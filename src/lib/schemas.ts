import { z } from "zod";

// --- Esquema para el registro de nuevos usuarios ---
export const signupSchema = z.object({
    name: z.string().min(2, "El nombre es obligatorio."),
    lastName: z.string().min(2, "Los apellidos son obligatorios."),
    email: z.string().email("El correo electrónico no es válido."),
    password: z.string()
        .min(6, "La contraseña debe tener al menos 6 caracteres.")
        .regex(/[A-Z]/, "La contraseña debe tener al menos una letra mayúscula.")
        .regex(/[a-z]/, "La contraseña debe tener al menos una letra minúscula.")
        .regex(/[0-9]/, "La contraseña debe tener al menos un número.")
        .regex(/[!@#$&*]/, "La contraseña debe tener al menos un carácter especial (!, @, #, $, &, *)."),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"], // Asocia el error al campo de confirmar contraseña
});


// --- Esquema para la actualización del perfil de usuario ---
export const profileFormSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "El nombre es obligatorio."),
    lastName: z.string().min(2, "Los apellidos son obligatorios."),
    email: z.string().email("El correo electrónico no es válido."),
    birthDate: z.string().min(1, "La fecha de nacimiento es obligatoria."),
    country: z.string().min(1, "El país es obligatorio."),
    state: z.string().min(1, "El estado es obligatorio."),
    gender: z.enum(['masculino', 'femenino', 'otro'], {
        required_error: "Debes seleccionar un género.",
    }),
    postalCode: z.string().min(1, "El código postal es obligatorio."),
    whatsapp: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
}).refine(data => {
    // Si se proporciona una nueva contraseña, debe cumplir las reglas y coincidir
    if (data.newPassword) {
        if (data.newPassword.length < 6) return false;
        if (!/[A-Z]/.test(data.newPassword)) return false;
        if (!/[a-z]/.test(data.newPassword)) return false;
        if (!/[0-9]/.test(data.newPassword)) return false;
        if (!/[!@#$&*]/.test(data.newPassword)) return false;
        return data.newPassword === data.confirmPassword;
    }
    return true;
}, {
    message: "La nueva contraseña no cumple los requisitos o no coincide.",
    path: ["confirmPassword"],
});
