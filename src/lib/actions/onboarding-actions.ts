'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, updateUserData } from '../data';
import { awardPoints } from './gamification-actions';

export async function completeOnboardingAction(tourType: 'dashboard' | 'bike') {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const currentOnboarding = user.onboarding || { dashboardSeen: false, bikeDetailSeen: false };
    
    // Check if points should be awarded (only first time)
    if (tourType === 'dashboard' && !currentOnboarding.dashboardSeen) {
        // Run in background, don't block response
        awardPoints(user.id, 'onboarding_complete', { tourType }).catch(console.error);
    }
    
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
