'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE } from '@/lib/gamification/constants';

function TrackerLogic() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const refCode = searchParams.get('ref');
        
        // Simple validation: Ensure code exists and has reasonable length
        if (refCode && refCode.length >= 5 && refCode.length <= 20) {
            
            // Set cookie using vanilla JS
            // max-age is in seconds
            document.cookie = `${REFERRAL_COOKIE_NAME}=${refCode}; path=/; max-age=${REFERRAL_COOKIE_MAX_AGE}; SameSite=Lax`;
            
            if (process.env.NODE_ENV === 'development') {
                console.log(`[ReferralTracker] Saved referral code: ${refCode}`);
            }
        }
    }, [searchParams]);

    return null;
}

export function ReferralTracker() {
    return (
        <Suspense fallback={null}>
            <TrackerLogic />
        </Suspense>
    );
}
