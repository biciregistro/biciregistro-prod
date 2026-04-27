"use server";

import { adminAuth, adminDb as db } from '../firebase/server';
import { userFormSchema } from '../schemas';
import { getAuthenticatedUser } from '../data';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { ActionFormState, User } from '../types';

function generateReferralCode(name: string): string {
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${randomSuffix}`;
}

// Used for server-side processing where 'id' might not be present initially
// Usamos .and() porque userFormSchema ahora es un ZodEffects (por el superRefine)
const serverSignupSchema = userFormSchema.and(
  z.object({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
    termsAccepted: z.union([z.boolean(), z.string().transform((val) => val === 'true')]),
    communityId: z.string().optional(),
  })
);

// Schema estricto para el nuevo registro exclusivo de ONG
const ongSignupSchemaServer = z.object({
    name: z.string().min(2, "El nombre es obligatorio."),
    lastName: z.string().min(2, "Los apellidos son obligatorios."),
    email: z.string().email("El correo electrónico no es válido."),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
    termsAccepted: z.union([z.boolean(), z.string().transform((val) => val === 'true')]),
});

const serverUpdateSchema = userFormSchema.and(
  z.object({
    newPassword: z.string().optional(),
    currentPassword: z.string().optional(),
    communityId: z.string().optional(),
  })
).superRefine((data: any, ctx: z.RefinementCtx) => {
    if (data.newPassword && !data.currentPassword) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La contraseña actual es requerida para cambiarla.",
            path: ['currentPassword']
        });
    }
});


export async function signup(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const rawData = Object.fromEntries(formData.entries());
    
    // Log the raw data to see what we are receiving
    console.log("Raw Signup Data:", rawData);
    
    // Explicitly parse the boolean for termsAccepted before validation
    const parsedData = {
        ...rawData,
        termsAccepted: rawData.termsAccepted === 'true' ? 'true' : 'false',
    };

    const validatedFields = serverSignupSchema.safeParse(parsedData);

    if (!validatedFields.success) {
        console.error("Signup validation failed:", validatedFields.error.flatten().fieldErrors);
        return {
            error: 'Datos inválidos. Por favor, revisa el formulario.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    if (!validatedFields.data.termsAccepted) {
         return {
            error: 'Debes aceptar los Términos y Condiciones.',
            errors: { termsAccepted: ['Debes aceptar los Términos y Condiciones.'] },
        };
    }

    const data = validatedFields.data;

    try {
        const userRecord = await adminAuth.createUser({
            email: data.email,
            password: data.password,
            displayName: `${data.name} ${data.lastName}`,
        });
        
        let referralCode = generateReferralCode(data.name);
        
        // Ensure referral code uniqueness (basic retry logic)
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 3) {
             const existingRef = await db.collection('users').where('referralCode', '==', referralCode).get();
             if (existingRef.empty) {
                 isUnique = true;
             } else {
                 referralCode = generateReferralCode(data.name);
                 attempts++;
             }
        }
        
        const newUser: User = {
            id: userRecord.uid,
            email: data.email!,
            name: data.name,
            lastName: data.lastName,
            birthDate: data.birthDate,
            country: data.country,
            state: data.state,
            city: data.city,
            gender: data.gender,
            whatsapp: data.whatsapp,
            role: 'ciclista',
            termsAcceptedAt: new Date().toISOString(),
            termsVersion: '2025-02-15',
            createdAt: new Date().toISOString(),
            referralCode: referralCode,
        };

        if (data.communityId) {
            newUser.communityId = data.communityId;
            console.log(`User ${newUser.id} linked to community ${data.communityId}`);
        }

        const customToken = await adminAuth.createCustomToken(userRecord.uid);

        await db.collection('users').doc(userRecord.uid).set(newUser);

        return { 
            success: true, 
            message: 'Cuenta creada exitosamente.',
            customToken: customToken 
        };

    } catch (error: any) {
        console.error("Error creating user:", error);
        if (error.code === 'auth/email-already-exists') {
            return { error: 'El correo electrónico ya está en uso.', errors: { email: ['El correo electrónico ya está en uso.'] } };
        }
        return { error: 'Ocurrió un error al crear la cuenta. Inténtalo de nuevo.' };
    }
}

// NUEVA FUNCIÓN: Registro EXCLUSIVO para ONGs
export async function ongSignup(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const rawData = Object.fromEntries(formData.entries());
    
    const parsedData = {
        ...rawData,
        termsAccepted: rawData.termsAccepted === 'true' ? 'true' : 'false',
    };

    const validatedFields = ongSignupSchemaServer.safeParse(parsedData);

    if (!validatedFields.success) {
        return {
            error: 'Datos inválidos. Por favor, revisa el formulario.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    if (!validatedFields.data.termsAccepted) {
         return {
            error: 'Debes aceptar los Términos y Condiciones.',
            errors: { termsAccepted: ['Debes aceptar los Términos y Condiciones.'] },
        };
    }

    const data = validatedFields.data;

    try {
        const userRecord = await adminAuth.createUser({
            email: data.email,
            password: data.password,
            displayName: `${data.name} ${data.lastName}`,
        });
        
        let referralCode = generateReferralCode(data.name);
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 3) {
             const existingRef = await db.collection('users').where('referralCode', '==', referralCode).get();
             if (existingRef.empty) {
                 isUnique = true;
             } else {
                 referralCode = generateReferralCode(data.name);
                 attempts++;
             }
        }

        const newUser: User = {
            id: userRecord.uid,
            email: data.email!,
            name: data.name,
            lastName: data.lastName,
            role: 'ong', // SIEMPRE ONG
            onboardingCompleted: false, // SIEMPRE REQUIERE ONBOARDING
            termsAcceptedAt: new Date().toISOString(),
            termsVersion: '2025-02-15',
            createdAt: new Date().toISOString(),
            referralCode: referralCode,
        };

        const customToken = await adminAuth.createCustomToken(userRecord.uid);

        await db.collection('users').doc(userRecord.uid).set(newUser);
        
        // Inicializar perfil ONG vacío con el contacto prellenado
        await db.collection('ong-profiles').doc(userRecord.uid).set({
            id: userRecord.uid,
            contactPerson: `${data.name} ${data.lastName}`,
        });

        return { 
            success: true, 
            message: 'Cuenta creada exitosamente.',
            customToken: customToken 
        };

    } catch (error: any) {
        console.error("Error creating ONG user:", error);
        if (error.code === 'auth/email-already-exists') {
            return { error: 'El correo electrónico ya está en uso.', errors: { email: ['El correo electrónico ya está en uso.'] } };
        }
        return { error: 'Ocurrió un error al crear la cuenta. Inténtalo de nuevo.' };
    }
}


export async function updateProfile(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const user = await getAuthenticatedUser();
    if (!user) {
        return { error: 'No estás autenticado.' };
    }

    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = serverUpdateSchema.safeParse(rawData);

    if (!validatedFields.success) {
         console.error("Profile update validation failed:", validatedFields.error.flatten().fieldErrors);
        return {
            error: 'Datos inválidos. Por favor, revisa el formulario.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const data = validatedFields.data;

    try {
        let passwordChanged = false;

        if (data.newPassword && data.currentPassword) {
             await adminAuth.updateUser(user.id, {
                password: data.newPassword,
            });
            passwordChanged = true;
        }
        
        let referralCode = user.referralCode;
        if(!referralCode) {
             referralCode = generateReferralCode(data.name);
             let isUnique = false;
             let attempts = 0;
             while (!isUnique && attempts < 3) {
                  const existingRef = await db.collection('users').where('referralCode', '==', referralCode).get();
                  if (existingRef.empty) {
                      isUnique = true;
                  } else {
                      referralCode = generateReferralCode(data.name);
                      attempts++;
                  }
             }
        }
        
        const updatePayload: any = {
            name: data.name,
            lastName: data.lastName,
            birthDate: data.birthDate || null,
            country: data.country || null,
            state: data.state || null,
            city: data.city || null,
            gender: data.gender || null,
            whatsapp: data.whatsapp || null,
            
            emergencyContactName: data.emergencyContactName || null,
            emergencyContactPhone: data.emergencyContactPhone || null,
            bloodType: data.bloodType || null,
            allergies: data.allergies || null,
            
            notificationPreferences: {
                safety: data.notificationsSafety ?? true,
                marketing: data.notificationsMarketing ?? false
            },
            
            referralCode: referralCode
        };

        // Cleanup undefined values to avoid Firestore errors
        Object.keys(updatePayload).forEach(key => {
            if (updatePayload[key] === undefined) {
                delete updatePayload[key];
            }
        });

        await db.collection('users').doc(user.id).update(updatePayload);
        
        // GAMIFICATION: Award points for completing profile
        let pointsAwarded = 0;
        // Accessing the nested object using standard optional chaining syntax
        const hasProfileCompleted = (user as any).gamification?.profileCompleted;
        if (!hasProfileCompleted) {
            // Check if essential fields are now filled
            if (updatePayload.name && updatePayload.lastName && updatePayload.emergencyContactName && updatePayload.emergencyContactPhone) {
                 const pointsRef = db.collection('users').doc(user.id);
                 
                 await db.runTransaction(async (transaction) => {
                     const doc = await transaction.get(pointsRef);
                     if (!doc.exists) return;
                     
                     const userData = doc.data() as User;
                     const currentPoints = userData.gamification?.pointsBalance || 0; // Using standard property from types
                     const newPoints = currentPoints + 50; // Award 50 km for profile
                     pointsAwarded = 50;
                     
                     transaction.update(pointsRef, {
                         'gamification.pointsBalance': newPoints,
                         'gamification.lifetimePoints': (userData.gamification?.lifetimePoints || 0) + 50,
                         'gamification.profileCompleted': true,
                         'gamification.lastUpdated': new Date().toISOString()
                     });
                     
                     // Log the transaction
                     const logRef = db.collection('users').doc(user.id).collection('points-log').doc();
                     transaction.set(logRef, {
                         amount: 50,
                         reason: 'profile_completion',
                         description: 'Perfil de seguridad completado',
                         createdAt: new Date().toISOString()
                     });
                 });
            }
        }

        // --- ENRICHMENT FIX: Sync to ong-profiles if user is an ONG ---
        // If an ONG updates their name/lastName in the profile tab, we should keep it somewhat synced,
        // although typically ONGs manage this via /dashboard/ong/profile.
        // But for safety and consistency:
        if (user.role === 'ong') {
             await db.collection('ong-profiles').doc(user.id).set({
                 contactPerson: `${data.name} ${data.lastName}`.trim(),
             }, { merge: true });
        }


        revalidatePath('/dashboard/profile');
        revalidatePath('/', 'layout');

        return { 
            success: true, 
            message: passwordChanged ? 'Perfil y contraseña actualizados.' : 'Perfil actualizado correctamente.',
            passwordChanged,
            pointsAwarded: pointsAwarded > 0 ? pointsAwarded : undefined
        };

    } catch (error: any) {
        console.error("Error updating profile:", error);
        return { error: 'Ocurrió un error al actualizar el perfil.' };
    }
}

// NUEVA FUNCIÓN: Sincronizar usuario de Google/Redes Sociales con roles contextuales
// MODIFICADA: Ahora retorna el rol real del usuario desde Firestore para evitar lag de claims
export async function syncSocialUser(idToken: string, roleContext?: string): Promise<{ success: boolean; isNewUser?: boolean; role?: string; error?: string; pointsAwarded?: number }> {
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        
        const userDoc = await db.collection('users').doc(uid).get();
        let isNewUser = false;
        let pointsAwarded = 0;
        let finalRole = '';

        if (!userDoc.exists) {
            isNewUser = true;
            
            const firebaseUser = await adminAuth.getUser(uid);
            
            let referralCode = generateReferralCode(firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'USER');
             let isUnique = false;
             let attempts = 0;
             while (!isUnique && attempts < 3) {
                  const existingRef = await db.collection('users').where('referralCode', '==', referralCode).get();
                  if (existingRef.empty) {
                      isUnique = true;
                  } else {
                      referralCode = generateReferralCode(firebaseUser.displayName || 'USER');
                      attempts++;
                  }
             }

             // Split name for proper structure
             const displayName = firebaseUser.displayName || "";
             const nameParts = displayName.split(" ");
             const name = nameParts.shift() || firebaseUser.email?.split("@")[0] || "Usuario";
             const lastName = nameParts.join(" ");

             const assignedRole = roleContext === 'ong' ? 'ong' : 'ciclista';
             finalRole = assignedRole;
             const onboardingCompleted = assignedRole === 'ong' ? false : undefined;

            const newUser: User = {
                id: uid,
                email: firebaseUser.email!,
                name: name,
                lastName: lastName,
                avatarUrl: firebaseUser.photoURL || undefined,
                role: assignedRole,
                onboardingCompleted: onboardingCompleted,
                termsAcceptedAt: new Date().toISOString(),
                termsVersion: '2025-02-15',
                createdAt: new Date().toISOString(),
                referralCode: referralCode,
                gamification: {
                    currentTier: 'novice',
                    stats: { referralsCount: 0 },
                    badges: [],
                    pointsBalance: 50, // Welcome points
                    lifetimePoints: 50
                }
            };

            await db.collection('users').doc(uid).set(newUser);
            pointsAwarded = 50;

            // Log welcome points
            await db.collection('users').doc(uid).collection('points-log').add({
                amount: 50,
                reason: 'welcome_bonus',
                description: 'Bono de bienvenida por registro',
                createdAt: new Date().toISOString()
            });

             if (assignedRole === 'ong') {
                 await db.collection('ong-profiles').doc(uid).set({
                     id: uid,
                     contactPerson: displayName,
                     logoUrl: firebaseUser.photoURL || undefined
                 });
            }

            console.log(`New social user synced: ${uid}`);
        } else {
             const userData = userDoc.data() as User;
             finalRole = userData.role;
             
             // Optional: Update avatar if changed in google
             const firebaseUser = await adminAuth.getUser(uid);
             if (firebaseUser.photoURL && firebaseUser.photoURL !== userData.avatarUrl) {
                 await db.collection('users').doc(uid).update({
                     avatarUrl: firebaseUser.photoURL
                 });
             }
        }

        return { success: true, isNewUser, role: finalRole, pointsAwarded };
    } catch (error) {
        console.error("Error syncing social user:", error);
        return { success: false, error: 'Error interno de sincronización.' };
    }
}
