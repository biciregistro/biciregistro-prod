'server-only';
import { unstable_cache } from 'next/cache';
import { adminDb } from './firebase/server';
import { FieldPath } from 'firebase-admin/firestore';
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
            
        // 2. Fetch ONGs needed (Optimization: Fetch only unique ONGs)
        const ongIds = new Set<string>();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.ongId) ongIds.add(data.ongId);
        });

        const ongNamesMap = new Map<string, string>();
        if (ongIds.size > 0) {
            // Cannot use 'in' query for > 10 IDs easily, so we fetch profiles in chunks or just all if reasonable.
            // Since ongs collection is likely smaller than users, or we can use promise.all for individual fetches if many.
            // Assuming < 30 active ONGs for now. If scaling needed, use batched 'in' queries.
            
            // Actually, fetching ong-profiles is efficient
            const ongChunks = Array.from(ongIds);
            const ongPromises = [];
            // Firestore 'in' limit is 10
            for (let i = 0; i < ongChunks.length; i += 10) {
                const chunk = ongChunks.slice(i, i + 10);
                // Use FieldPath.documentId() for querying by ID
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

        // 3. Process Events in Parallel to attach Financials
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

            // Calculate financials ONLY if it's a paid event to save reads
            let totalCollected = 0;
            let amountDispersed = 0; // Placeholder for future feature
            let pendingDisbursement = 0;

            if (eventBase.costType !== 'Gratuito') {
                const summary = await getEventFinancialSummary(eventBase.id);
                totalCollected = summary.total.gross;
                // Pending logic matches ONG view: (Platform Net - Platform Fee) - Manual Fee
                // If the math is consistent with getEventFinancialSummary, we are good.
                pendingDisbursement = summary.balanceToDisperse;
                
                // TODO: When 'Disbursements' collection exists, subtract actual payouts from pendingDisbursement
                // amountDispersed = await getDispersedAmount(eventBase.id);
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

        const registrationsRef = adminDb.collection('event-registrations').where('eventId', '==', eventId);
        const snapshot = await registrationsRef.get();
        
        const summary: DetailedFinancialSummary = {
            total: { gross: 0, net: 0, fee: 0 },
            platform: { gross: 0, net: 0, fee: 0 },
            manual: { gross: 0, net: 0, fee: 0 },
            balanceToDisperse: 0
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

        summary.balanceToDisperse = (summary.platform.gross - summary.platform.fee) - summary.manual.fee;

        return summary;
    } catch (error) {
        console.error("Error calculating event financial summary:", error);
        return {
            total: { gross: 0, net: 0, fee: 0 },
            platform: { gross: 0, net: 0, fee: 0 },
            manual: { gross: 0, net: 0, fee: 0 },
            balanceToDisperse: 0
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
