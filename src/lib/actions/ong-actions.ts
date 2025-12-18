"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/data";
import { ongProfileSchema } from "@/lib/schemas";
import { adminDb as db } from "@/lib/firebase/server";

export async function updateOngProfile(values: z.infer<typeof ongProfileSchema>) {
    const user = await getAuthenticatedUser();

    if (!user || user.role !== "ong") {
        return { success: false, message: "No autorizado." };
    }

    const validatedFields = ongProfileSchema.safeParse(values);

    if (!validatedFields.success) {
        return { success: false, message: "Datos inválidos." };
    }

    try {
        const userId = user.id;

        // 1. Prepare data for 'ong-profiles' collection
        const ongProfileData = {
            ...validatedFields.data,
            id: userId,
        };

        const ongProfileRef = db.collection("ong-profiles").doc(userId);
        await ongProfileRef.set(ongProfileData, { merge: true });

        // 2. Prepare data for 'users' collection (Critical for Header/Layout sync)
        const userData = {
            name: validatedFields.data.organizationName, // MAP ORGANIZATION NAME TO USER NAME
            avatarUrl: validatedFields.data.logoUrl || "", // MAP LOGO TO AVATAR
            logoUrl: validatedFields.data.logoUrl || "",
            country: validatedFields.data.country,
            state: validatedFields.data.state,
            whatsapp: validatedFields.data.contactWhatsapp, 
        };

        const userDocRef = db.collection("users").doc(userId);
        await userDocRef.set(userData, { merge: true });

        // 3. Revalidate paths
        revalidatePath("/dashboard/ong");
        revalidatePath("/dashboard/ong/profile");
        revalidatePath("/", "layout");

        return { success: true, message: "Perfil actualizado correctamente." };
    } catch (error) {
        console.error("Error updating ONG profile:", error);
        return { success: false, message: "Ocurrió un error al actualizar el perfil." };
    }
}
