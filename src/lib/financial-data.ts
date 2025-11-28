import 'server-only';
import { unstable_cache } from 'next/cache';
import { adminDb } from './firebase/server';
import type { FinancialSettings } from './types';

const SETTINGS_COLLECTION = 'settings';
const FINANCIAL_DOC_ID = 'financial';

// Default values as fallback
const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = {
    commissionRate: 3.5,
    pasarelaRate: 3.5,
    pasarelaFixed: 4.50,
    ivaRate: 16.0,
};

// Internal logic to fetch settings directly from Firestore
async function _getFinancialSettingsLogic(): Promise<FinancialSettings> {
    try {
        const docSnap = await adminDb.collection(SETTINGS_COLLECTION).doc(FINANCIAL_DOC_ID).get();
        
        if (docSnap.exists) {
            return { ...DEFAULT_FINANCIAL_SETTINGS, ...docSnap.data() } as FinancialSettings;
        }
        
        // If not exists, return defaults (and optionally create it, but better to just return default)
        return DEFAULT_FINANCIAL_SETTINGS;
    } catch (error) {
        console.error("Error fetching financial settings:", error);
        return DEFAULT_FINANCIAL_SETTINGS;
    }
}

// Cached version for performance (Revalidate every hour or via tag)
export const getFinancialSettings = unstable_cache(
    async () => _getFinancialSettingsLogic(),
    ['financial-settings'],
    { revalidate: 3600, tags: ['financial-settings'] }
);

export async function updateFinancialSettings(settings: FinancialSettings): Promise<void> {
    try {
        await adminDb.collection(SETTINGS_COLLECTION).doc(FINANCIAL_DOC_ID).set(settings);
    } catch (error) {
        console.error("Error updating financial settings:", error);
        throw new Error("No se pudo actualizar la configuración financiera.");
    }
}
