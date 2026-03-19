'use server';

import { adminAuth } from '@/lib/firebase/server';
import { getDecodedSession, deleteSession } from '@/lib/auth';
import { createUser, getUser, updateUserData } from '@/lib/data';
import { awardPoints } from '@/lib/actions/gamification-actions';
import { sendWelcomeEmail } from '@/lib/email/resend-service';
import { revalidatePath } from 'next/cache';

/**
 * Syncs a social login user with Firestore.
 * This is called after the client has performed a successful social login.
 * It ensures a user document exists and handles first-time points.
 */
export async function syncSocialUser() {
    try {
        const session = await getDecodedSession();
        
        if (!session) {
            return { success: false, error: 'No se pudo verificar la sesión social.' };
        }

        const { uid, email, name, picture } = session;

        // 1. Check if user already exists in Firestore
        const existingUser = await getUser(uid);

        if (existingUser) {
            // Update profile picture if it changed
            // FIX: Use 'avatarUrl' instead of 'imageUrl' as per User type in src/lib/types.ts
            if (picture && existingUser.avatarUrl !== picture) {
                await updateUserData(uid, { avatarUrl: picture });
            }
            return { success: true, isNewUser: false };
        }

        // 2. Create new user document
        const displayNameParts = (name || '').split(' ');
        const firstName = displayNameParts[0] || '';
        const lastName = displayNameParts.slice(1).join(' ') || '';

        const newUserData = {
            id: uid,
            email: email || '',
            name: firstName,
            lastName: lastName,
            avatarUrl: picture || '', // FIX: Use 'avatarUrl'
            role: 'ciclista' as const,
            notificationPreferences: {
                safety: true,
                marketing: false
            },
            createdAt: new Date().toISOString(),
        };

        await createUser(newUserData as any);

        // 3. Award signup points
        let pointsAwarded = 0;
        try {
            const pointsResult = await awardPoints(uid, 'user_signup');
            pointsAwarded = pointsResult?.points || 0;
        } catch (e) {
            console.error("[SyncSocial] Error awarding points:", e);
        }

        // 4. Send welcome email
        if (email) {
            sendWelcomeEmail({ name: firstName || 'Ciclista', email }).catch(console.error);
        }

        revalidatePath('/dashboard');
        
        return { 
            success: true, 
            isNewUser: true, 
            pointsAwarded 
        };

    } catch (error: any) {
        console.error("[SyncSocial] Critical error:", error);
        return { success: false, error: 'Error interno al sincronizar perfil.' };
    }
}
