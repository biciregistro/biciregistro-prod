'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, updateUserData } from '../data';

export async function completeOnboardingAction(tourType: 'dashboard' | 'bike') {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const currentOnboarding = user.onboarding || { dashboardSeen: false, bikeDetailSeen: false };
    
    const updatedOnboarding = {
        ...currentOnboarding,
        [tourType === 'dashboard' ? 'dashboardSeen' : 'bikeDetailSeen']: true
    };

    try {
        await updateUserData(user.id, { onboarding: updatedOnboarding });
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error("Error completing onboarding:", error);
        return { success: false, error: 'Error al actualizar el estado de onboarding' };
    }
}
