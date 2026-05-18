'use client';

import { useEffect } from 'react';
import { recordDailyActivity } from '@/lib/actions/auth-actions';

export function ClientActivityTracker() {
    useEffect(() => {
        const trackActivity = async () => {
            try {
                const today = new Date().toDateString();
                const lastTracked = localStorage.getItem('lastTrackedDate');

                if (today !== lastTracked) {
                    await recordDailyActivity();
                    localStorage.setItem('lastTrackedDate', today);
                }
            } catch (e) {
                console.error("Error tracking activity:", e);
            }
        };

        trackActivity();
    }, []);

    return null;
}
