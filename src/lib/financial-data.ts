import 'server-only';
import { unstable_cache } from 'next/cache';
import { adminDb } from './firebase/server';
import type { FinancialSettings, OngUser, EventRegistration, Event } from './types';

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

export async function updateOngFinancialData(ongId: string, financialData: NonNullable<OngUser['financialData']>) {
    try {
        await adminDb.collection('ong-profiles').doc(ongId).update({
            financialData: financialData
        });
    } catch (error) {
        console.error("Error updating ONG financial data:", error);
        throw new Error("No se pudieron guardar los datos bancarios.");
    }
}

// --- Payment & Registration Financial Helpers ---

export async function getEventRegistration(registrationId: string): Promise<EventRegistration | null> {
    try {
        const doc = await adminDb.collection('event-registrations').doc(registrationId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as EventRegistration;
    } catch (error) {
        console.error("Error fetching registration:", error);
        return null;
    }
}

export async function updateRegistrationManualPayment(registrationId: string, feeAmount: number) {
    try {
        await adminDb.collection('event-registrations').doc(registrationId).update({
            paymentStatus: 'paid',
            paymentMethod: 'manual',
            feeAmount: feeAmount,
            // Track when this happened
            manualPaymentAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error updating manual payment:", error);
        throw new Error("No se pudo registrar el pago manual.");
    }
}

// --- Admin Financial Oversight ---

export async function getAllEventsForAdmin(): Promise<Event[]> {
    try {
        const snapshot = await adminDb.collection('events')
            .orderBy('date', 'desc')
            .limit(100)
            .get();
            
        return snapshot.docs.map(doc => {
            const data = doc.data();
            // Manual timestamp conversion to avoid dependency on helpers
            let date = data.date;
            if (date && typeof date.toDate === 'function') {
                date = date.toDate().toISOString();
            } else if (date && date instanceof Date) {
                date = date.toISOString();
            }

            let deadline = data.registrationDeadline;
            if (deadline && typeof deadline.toDate === 'function') {
                deadline = deadline.toDate().toISOString();
            } else if (deadline && deadline instanceof Date) {
                deadline = deadline.toISOString();
            }

            return { 
                id: doc.id, 
                ...data,
                date: date,
                registrationDeadline: deadline
            } as Event;
        });
    } catch (error) {
        console.error("Error fetching all events for admin:", error);
        return [];
    }
}

// --- Event Financial Summary (Aggregation) ---

export async function getEventFinancialSummary(eventId: string) {
    try {
        const registrationsRef = adminDb.collection('event-registrations').where('eventId', '==', eventId);
        const snapshot = await registrationsRef.get();
        
        let totalRevenue = 0;
        let platformRevenue = 0;
        let manualRevenue = 0;
        let platformFees = 0;
        let manualFeesDebt = 0;
        let netRevenue = 0; 

        snapshot.forEach(doc => {
            const reg = doc.data() as EventRegistration;
            // Only count confirmed & paid
            if (reg.status !== 'confirmed' || reg.paymentStatus !== 'paid') return;

            const amount = reg.price || 0;
            const fee = reg.feeAmount || 0;
            // If netPrice is missing, fallback logic: net = amount - fee
            const net = reg.netPrice !== undefined ? reg.netPrice : (amount - fee);

            totalRevenue += amount;
            netRevenue += net;

            if (reg.paymentMethod === 'manual') {
                manualRevenue += amount;
                manualFeesDebt += fee;
            } else {
                // Default is platform (card)
                platformRevenue += amount;
                platformFees += fee;
            }
        });

        // The money platform holds = Platform Revenue
        // The money platform keeps = Platform Fees + Manual Fees Debt
        // Money to disperse = Platform Revenue - (Platform Fees + Manual Fees Debt)
        // Which simplifies to: (PlatformRevenue - PlatformFees) - ManualFeesDebt
        
        // Example: 
        // 1 Card (1000 + 100 fee) -> Platform has 1100. Platform keeps 100. Owe Org 1000.
        // 1 Cash (1000 + 100 fee) -> Org has 1100. Platform keeps 0. Org owes Platform 100.
        // Net: 1000 (from card) - 100 (debt from cash) = 900 to disperse.
        
        const balanceToDisperse = (platformRevenue - platformFees) - manualFeesDebt;

        return {
            totalRevenue,
            platformRevenue,
            manualRevenue,
            platformFees,
            manualFeesDebt,
            netRevenue,
            balanceToDisperse
        };
    } catch (error) {
        console.error("Error calculating event financial summary:", error);
        return {
            totalRevenue: 0,
            platformRevenue: 0,
            manualRevenue: 0,
            platformFees: 0,
            manualFeesDebt: 0,
            netRevenue: 0,
            balanceToDisperse: 0
        };
    }
}
