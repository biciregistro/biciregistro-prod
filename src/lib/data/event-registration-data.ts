import 'server-only';
import { adminDb } from '../firebase/server';
import { getUser, getEvent, getBike } from './core'; 
import { EventRegistration, EventAttendee, MarketingConsent, CostTier } from '../types';
import { Event } from '../types';
import { unstable_noStore as noStore } from 'next/cache';

export async function getRegistrationById(registrationId: string): Promise<EventRegistration | null> {
    noStore();
    if (!registrationId) return null;
    
    try {
        const db = adminDb;
        const docSnap = await db.collection('event-registrations').doc(registrationId).get();

        if (!docSnap.exists) {
            return null;
        }

        return { id: docSnap.id, ...docSnap.data() } as EventRegistration;
    } catch (error) {
        console.error("Error fetching registration by ID:", error);
        return null;
    }
}

type RegistrationInput = Omit<EventRegistration, 'id' | 'registrationDate' | 'status'> & {
    marketingConsent?: MarketingConsent | null;
    customAnswers?: Record<string, string | string[]>; // Added support for custom answers
};

// Return type updated to include registrationId on success
export async function registerUserToEvent(
    registrationData: RegistrationInput
): Promise<{ success: true; registrationId: string; message: string } | { success: false; error: string }> {
    const db = adminDb;
    const { eventId, userId } = registrationData;

    try {
        return await db.runTransaction(async (transaction) => {
            const eventRef = db.collection('events').doc(eventId);
            const eventDoc = await transaction.get(eventRef);

            if (!eventDoc.exists) {
                return { success: false, error: "El evento no existe." };
            }

            const eventData = eventDoc.data() as Event;
            
            const maxParticipants = eventData.maxParticipants || 0;
            const currentParticipants = eventData.currentParticipants || 0;

            if (maxParticipants > 0 && currentParticipants >= maxParticipants) {
                return { success: false, error: "Lo sentimos, el cupo para este evento está lleno." };
            }

            const regQuery = db.collection('event-registrations')
                .where('userId', '==', userId)
                .where('eventId', '==', eventId)
                .limit(1);
            
            const regSnapshot = await transaction.get(regQuery);
            let existingRegDoc = null;
            
            if (!regSnapshot.empty) {
                const doc = regSnapshot.docs[0];
                const data = doc.data() as EventRegistration;
                if (data.status === 'cancelled') {
                    existingRegDoc = doc;
                } else {
                     return { success: false, error: "Ya te encuentras registrado en este evento." };
                }
            }

            // --- TIER VALIDATION (New Logic) ---
            let selectedTier: CostTier | undefined;
            let updatedCostTiers: CostTier[] | undefined;
            
            if (registrationData.tierId && eventData.costTiers) {
                const tierIndex = eventData.costTiers.findIndex(t => t.id === registrationData.tierId);
                
                if (tierIndex !== -1) {
                    selectedTier = eventData.costTiers[tierIndex];
                    
                    // Check individual tier limit
                    const limit = selectedTier.limit || 0;
                    const sold = selectedTier.soldCount || 0;
                    
                    if (limit > 0 && sold >= limit) {
                        return { success: false, error: `El nivel "${selectedTier.name}" se ha agotado.` };
                    }

                    // Prepare update for soldCount
                    updatedCostTiers = [...eventData.costTiers];
                    updatedCostTiers[tierIndex] = {
                        ...selectedTier,
                        soldCount: sold + 1
                    };
                }
            }
            // -----------------------------------

            let paymentStatus = 'pending';
            // Determine price and financial snapshot from the event configuration at this moment
            const price = selectedTier?.price ?? 0;

            if (eventData.costType === 'Gratuito' || price === 0) {
                // Si es gratuito o el precio es 0, se marca como pagado o no aplicable
                // Usamos 'paid' si había un costo pero fue 0 (ej. promo) o 'not_applicable' si el evento es 100% gratuito
                paymentStatus = eventData.costType === 'Gratuito' ? 'not_applicable' : 'paid';
            }

            // --- FINANCIAL SNAPSHOTTING (MVP Phase 1) ---
            const financialSnapshot = selectedTier ? {
                amountPaid: selectedTier.price,
                platformFee: selectedTier.fee || 0,
                organizerNet: selectedTier.netPrice ?? selectedTier.price,
                isFeeAbsorbed: !!selectedTier.absorbFee,
                calculatedAt: new Date().toISOString()
            } : undefined;

            let assignedBibNumber = null;
            if (
                (paymentStatus === 'not_applicable' || paymentStatus === 'paid') && 
                eventData.bibNumberConfig?.enabled && 
                eventData.bibNumberConfig.mode === 'automatic'
            ) {
                assignedBibNumber = eventData.bibNumberConfig.nextNumber || 1;
                transaction.update(eventRef, { 'bibNumberConfig.nextNumber': assignedBibNumber + 1 });
            }

            const registrationPayload = {
                ...registrationData,
                price: price, // Re-write with current price from DB config for safety
                financialSnapshot, // Persist the truth of this transaction
                bloodType: registrationData.bloodType || null,
                insuranceInfo: registrationData.insuranceInfo || null,
                allergies: registrationData.allergies || null,
                registrationDate: new Date().toISOString(), 
                status: 'confirmed' as const,
                paymentStatus: paymentStatus as any,
                checkedIn: false,
                marketingConsent: registrationData.marketingConsent || null,
                bibNumber: assignedBibNumber,
                jerseyModel: registrationData.jerseyModel || null,
                jerseySize: registrationData.jerseySize || null,
                customAnswers: registrationData.customAnswers || {} // Persist custom answers
            };
            
            let registrationId: string;
            if (existingRegDoc) {
                transaction.update(existingRegDoc.ref, registrationPayload);
                registrationId = existingRegDoc.id;
            } else {
                const newRegRef = db.collection('event-registrations').doc();
                transaction.set(newRegRef, registrationPayload);
                registrationId = newRegRef.id;
            }

            if (registrationData.bloodType || registrationData.insuranceInfo || registrationData.allergies) {
                const userRef = db.collection('users').doc(userId);
                const updateData: any = {};
                if (registrationData.bloodType) updateData.bloodType = registrationData.bloodType;
                if (registrationData.insuranceInfo) updateData.insuranceInfo = registrationData.insuranceInfo;
                if (registrationData.allergies) updateData.allergies = registrationData.allergies;
                transaction.update(userRef, updateData);
            }

            const eventUpdate: any = {
                currentParticipants: currentParticipants + 1
            };

            // If we modified a tier count, include it in the update
            if (updatedCostTiers) {
                eventUpdate.costTiers = updatedCostTiers;
            }

            transaction.update(eventRef, eventUpdate);

            return { success: true, message: "¡Registro exitoso!", registrationId: registrationId };
        });
    } catch (error) {
        console.error("Transaction failure:", error);
        return { success: false, error: "Ocurrió un error al procesar tu registro. Inténtalo de nuevo." };
    }
}

export async function getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    noStore();
    if (!eventId) return [];
    
    try {
        const db = adminDb;
        
        const registrationsSnapshot = await db.collection('event-registrations')
            .where('eventId', '==', eventId)
            .get(); 

        if (registrationsSnapshot.empty) {
            return [];
        }

        const event = await getEvent(eventId);
        if (!event) return []; 

        const eventEndDate = new Date(event.date); 
        const privacyDeadline = new Date(eventEndDate.getTime() + 24 * 60 * 60 * 1000); 
        const now = new Date();
        const areEmergencyDetailsHidden = now > privacyDeadline;

        const tiersMap = new Map(event.costTiers?.map(t => [t.id, t.name]));
        const tiersPriceMap = new Map(event.costTiers?.map(t => [t.id, t.price]));
        const categoriesMap = new Map(event.categories?.map(c => [c.id, c.name]));

        const attendeesPromises = registrationsSnapshot.docs.map(async (doc) => {
            const regData = doc.data() as EventRegistration;
            const user = await getUser(regData.userId);
            
            let bikeData = undefined;
            if (regData.bikeId) {
                const bike = await getBike(regData.userId, regData.bikeId);
                if (bike) {
                    bikeData = {
                        id: bike.id,
                        make: bike.make,
                        model: bike.model,
                        serialNumber: bike.serialNumber
                    };
                }
            }
            
            // PRIORITY: Use persisted snapshot if available, otherwise fallback to current tier config
            let price = regData.financialSnapshot?.amountPaid ?? regData.price;
            if (price === undefined && regData.tierId) {
                price = tiersPriceMap.get(regData.tierId);
            }
            
            let paymentStatus = regData.paymentStatus || 'pending';
            if (event.costType === 'Gratuito') {
                paymentStatus = 'not_applicable';
            }

            return {
                id: doc.id,
                userId: regData.userId,
                name: user?.name || 'Usuario',
                lastName: user?.lastName || 'Eliminado',
                email: user?.email || '',
                whatsapp: user?.whatsapp,
                registrationDate: regData.registrationDate,
                tierName: regData.tierId ? tiersMap.get(regData.tierId) || 'N/A' : (event.costType === 'Gratuito' ? 'Gratuito' : 'N/A'),
                categoryName: regData.categoryId ? categoriesMap.get(regData.categoryId) || 'N/A' : 'N/A',
                status: regData.status,
                bike: bikeData,
                paymentStatus: paymentStatus as any,
                checkedIn: regData.checkedIn || false,
                price: price || 0,
                
                bibNumber: regData.bibNumber || null,
                jerseyModel: regData.jerseyModel || null,
                jerseySize: regData.jerseySize || null,
                
                emergencyContactName: areEmergencyDetailsHidden ? '***' : (regData.emergencyContactName || null),
                emergencyContactPhone: areEmergencyDetailsHidden ? '***' : (regData.emergencyContactPhone || null),
                bloodType: areEmergencyDetailsHidden ? '***' : (regData.bloodType || null),
                insuranceInfo: areEmergencyDetailsHidden ? '***' : (regData.insuranceInfo || null),
                allergies: areEmergencyDetailsHidden ? '***' : (regData.allergies || null),
                waiverSigned: !!regData.waiverSignature,
                customAnswers: regData.customAnswers || {} // Include custom answers
            } as EventAttendee;
        });

        const attendees = await Promise.all(attendeesPromises);
        return attendees.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());

    } catch (error) {
        console.error("Error fetching event attendees:", error);
        return [];
    }
}
