'server-only';
import { unstable_cache } from 'next/cache';
import { adminDb } from './firebase/server';
import { FieldPath } from 'firebase-admin/firestore';
import type { FinancialSettings, OngUser, EventRegistration, Event, Payout } from './types';

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

export async function updateRegistrationManualPayment(registrationId: string, feeAmount: number, priceAmount?: number) {
    try {
        const updateData: any = {
            paymentStatus: 'paid',
            paymentMethod: 'manual',
            feeAmount: feeAmount,
            // Track when this happened
            manualPaymentAt: new Date().toISOString()
        };

        if (priceAmount !== undefined) {
            updateData.price = priceAmount;
        }

        await adminDb.collection('event-registrations').doc(registrationId).update(updateData);
    } catch (error) {
        console.error("Error updating manual payment:", error);
        throw new Error("No se pudo registrar el pago manual.");
    }
}

// --- Payout Management ---

export async function getPayoutsByEvent(eventId: string): Promise<Payout[]> {
    try {
        const snapshot = await adminDb.collection('event-payouts')
            .where('eventId', '==', eventId)
            .orderBy('date', 'desc')
            .get();
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payout));
    } catch (error) {
        console.error("Error fetching payouts:", error);
        return [];
    }
}

// Internal helper to get sum of payouts
async function getTotalDispersed(eventId: string): Promise<number> {
    try {
        const payouts = await getPayoutsByEvent(eventId);
        return payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
    } catch (error) {
        return 0;
    }
}


// --- Admin Financial Oversight ---

// Extended Type for Admin View
export interface AdminEventFinancialView extends Event {
    ongName: string;
    totalCollected: number;
    amountDispersed: number;
    pendingDisbursement: number;
}

export async function getAllEventsForAdmin(): Promise<AdminEventFinancialView[]> {
    try {
        // 1. Fetch Events
        const snapshot = await adminDb.collection('events')
            .orderBy('date', 'desc')
            .limit(100)
            .get();
            
        // 2. Fetch ONGs needed
        const ongIds = new Set<string>();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.ongId) ongIds.add(data.ongId);
        });

        const ongNamesMap = new Map<string, string>();
        if (ongIds.size > 0) {
            const ongChunks = Array.from(ongIds);
            const ongPromises = [];
            for (let i = 0; i < ongChunks.length; i += 10) {
                const chunk = ongChunks.slice(i, i + 10);
                ongPromises.push(adminDb.collection('ong-profiles').where(FieldPath.documentId(), 'in', chunk).get());
            }
            
            const ongSnapshots = await Promise.all(ongPromises);
            ongSnapshots.forEach(snap => {
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    ongNamesMap.set(doc.id, data.organizationName || 'Organización Desconocida');
                });
            });
        }

        // 3. Process Events in Parallel
        const eventsPromises = snapshot.docs.map(async (doc) => {
            const data = doc.data();
            
            // Manual timestamp conversion
            let date = data.date;
            if (date && typeof date.toDate === 'function') date = date.toDate().toISOString();
            else if (date && date instanceof Date) date = date.toISOString();

            let deadline = data.registrationDeadline;
            if (deadline && typeof deadline.toDate === 'function') deadline = deadline.toDate().toISOString();
            else if (deadline && deadline instanceof Date) deadline = deadline.toISOString();

            const eventBase = { 
                id: doc.id, 
                ...data,
                date: date,
                registrationDeadline: deadline
            } as Event;

            const ongName = ongNamesMap.get(eventBase.ongId) || eventBase.ongId;

            let totalCollected = 0;
            let amountDispersed = 0;
            let pendingDisbursement = 0;

            if (eventBase.costType !== 'Gratuito') {
                const summary = await getEventFinancialSummary(eventBase.id);
                totalCollected = summary.total.gross;
                amountDispersed = summary.dispersed; // From updated summary
                pendingDisbursement = summary.balanceToDisperse;
            }

            return {
                ...eventBase,
                ongName,
                totalCollected,
                amountDispersed,
                pendingDisbursement
            } as AdminEventFinancialView;
        });

        const events = await Promise.all(eventsPromises);
        return events;

    } catch (error) {
        console.error("Error fetching all events for admin:", error);
        return [];
    }
}

// --- Event Financial Summary (Aggregation) ---

export interface FinancialBreakdown {
    gross: number;
    net: number;
    fee: number;
}

export interface DetailedFinancialSummary {
    total: FinancialBreakdown;
    platform: FinancialBreakdown;
    manual: FinancialBreakdown;
    balanceToDisperse: number;
    dispersed: number; // New field
}

export async function getEventFinancialSummary(eventId: string): Promise<DetailedFinancialSummary> {
    try {
        const eventDoc = await adminDb.collection('events').doc(eventId).get();
        const eventData = eventDoc.exists ? eventDoc.data() as Event : null;
        const tiersMap = new Map<string, { price: number, fee?: number, netPrice?: number }>();
        
        if (eventData?.costTiers) {
            eventData.costTiers.forEach(t => {
                tiersMap.set(t.id, { price: t.price, fee: t.fee, netPrice: t.netPrice });
            });
        }

        // Fetch Registrations
        const registrationsRef = adminDb.collection('event-registrations').where('eventId', '==', eventId);
        const snapshot = await registrationsRef.get();
        
        // Fetch Payouts (Dispersions)
        const dispersedAmount = await getTotalDispersed(eventId);

        const summary: DetailedFinancialSummary = {
            total: { gross: 0, net: 0, fee: 0 },
            platform: { gross: 0, net: 0, fee: 0 },
            manual: { gross: 0, net: 0, fee: 0 },
            balanceToDisperse: 0,
            dispersed: dispersedAmount
        };

        snapshot.forEach(doc => {
            const reg = doc.data() as EventRegistration;
            if (reg.status !== 'confirmed' || reg.paymentStatus !== 'paid') return;

            let amount = reg.price;
            let fee = reg.feeAmount;
            let net = reg.netPrice;

            if ((amount === undefined || amount === 0) && reg.tierId && tiersMap.has(reg.tierId)) {
                const tier = tiersMap.get(reg.tierId)!;
                amount = tier.price;
                if (fee === undefined) fee = tier.fee;
                if (net === undefined) net = tier.netPrice;
            }

            amount = amount || 0;
            fee = fee || 0;
            net = net !== undefined ? net : (amount - fee);

            summary.total.gross += amount;
            summary.total.net += net;
            summary.total.fee += fee;

            if (reg.paymentMethod === 'manual') {
                summary.manual.gross += amount;
                summary.manual.net += net;
                summary.manual.fee += fee;
            } else {
                summary.platform.gross += amount;
                summary.platform.net += net;
                summary.platform.fee += fee;
            }
        });

        // Calculation:
        // Net Platform Income = (Platform Gross - Platform Fee)
        // Manual Fee Debt = Manual Fee (The ONG collected this, so they owe us the fee)
        // Balance = Net Platform Income - Manual Fee Debt - Already Dispersed
        
        const netPlatformIncome = summary.platform.gross - summary.platform.fee;
        const manualFeeDebt = summary.manual.fee;
        
        summary.balanceToDisperse = netPlatformIncome - manualFeeDebt - dispersedAmount;

        return summary;
    } catch (error) {
        console.error("Error calculating event financial summary:", error);
        return {
            total: { gross: 0, net: 0, fee: 0 },
            platform: { gross: 0, net: 0, fee: 0 },
            manual: { gross: 0, net: 0, fee: 0 },
            balanceToDisperse: 0,
            dispersed: 0
        };
    }
}

// Helper to update registration status
export async function updateRegistrationStatusInternal(
    registrationId: string, 
    data: { paymentStatus?: string, checkedIn?: boolean, paymentMethod?: string | null }
) {
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    
    if (data.checkedIn === true) {
        (cleanData as any).checkedInAt = new Date().toISOString();
    }
    
    await adminDb.collection('event-registrations').doc(registrationId).update(cleanData);
}
