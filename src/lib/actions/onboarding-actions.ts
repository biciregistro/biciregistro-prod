'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, updateUserData } from '../data';
import { awardPoints } from './gamification-actions';

export async function completeOnboardingAction(tourType: 'dashboard' | 'bike') {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const currentOnboarding = user.onboarding || { dashboardSeen: false, bikeDetailSeen: false };
    
    let pointsAwarded = 0;

    // Check if points should be awarded (only first time)
    if (tourType === 'dashboard' && !currentOnboarding.dashboardSeen) {
        try {
            const pointsResult = await awardPoints(user.id, 'onboarding_complete', { tourType });
            pointsAwarded = pointsResult?.points || 0;
        } catch (e) {
            console.error("Error awarding onboarding points", e);
        }
    }
    
    const updatedOnboarding = {
        ...currentOnboarding,
        [tourType === 'dashboard' ? 'dashboardSeen' : 'bikeDetailSeen']: true
    };

    try {
        await updateUserData(user.id, { onboarding: updatedOnboarding });
        revalidatePath('/dashboard');
        return { success: true, pointsAwarded };
    } catch (error) {
        console.error("Error completing onboarding:", error);
        return { success: false, error: 'Error al actualizar el estado de onboarding' };
    }
}
