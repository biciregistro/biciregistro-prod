import { z } from "zod";

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
    if (data.newPassword || data.confirmPassword) {
        return data.newPassword === data.confirmPassword;
    }
    return true;
}, {
    message: "Las nuevas contraseñas no coinciden.",
    path: ["confirmPassword"],
}).refine(data => {
    // For signup, newPassword is required and must follow rules
    if (!data.id) { 
        if (!data.newPassword) return false;
        return /^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9])(?=.*[a-z]).{6,}$/.test(data.newPassword);
    }
    // For profile update, it's optional but must follow rules if present
    if (data.newPassword) {
        return /^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9])(?=.*[a-z]).{6,}$/.test(data.newPassword);
    }
    return true;
}, {
    message: "La contraseña debe tener al menos 6 caracteres, una mayúscula, un número y un carácter especial.",
    path: ["newPassword"],
});
