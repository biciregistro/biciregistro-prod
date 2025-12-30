import 'server-only';
import { adminDb } from '../firebase/server';
import { getUser, getEvent, getBike } from './core'; 
import { EventRegistration, EventAttendee, MarketingConsent } from '../types';
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
};

export async function registerUserToEvent(
    registrationData: RegistrationInput
): Promise<{ success: boolean; message?: string; error?: string }> {
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

            let paymentStatus = 'pending';
            // Logic for free events or 0 price tiers
            if (eventData.costType === 'Gratuito' || registrationData.price === 0) {
                paymentStatus = 'not_applicable';
            }

            // --- BIB NUMBER ASSIGNMENT LOGIC (For Free/Direct Confirmation) ---
            let assignedBibNumber = null;
            if (
                paymentStatus === 'not_applicable' && 
                eventData.bibNumberConfig?.enabled && 
                eventData.bibNumberConfig.mode === 'automatic'
            ) {
                assignedBibNumber = eventData.bibNumberConfig.nextNumber || 1;
                // Increment next number in event
                transaction.update(eventRef, { 'bibNumberConfig.nextNumber': assignedBibNumber + 1 });
            }
            // ------------------------------------------------------------------

            const registrationPayload = {
                ...registrationData,
                bloodType: registrationData.bloodType || null,
                insuranceInfo: registrationData.insuranceInfo || null,
                allergies: registrationData.allergies || null,
                registrationDate: new Date().toISOString(), 
                status: 'confirmed' as const,
                paymentStatus: paymentStatus as any,
                checkedIn: false,
                marketingConsent: registrationData.marketingConsent || null,
                bibNumber: assignedBibNumber, // Save assigned number
                jerseyModel: registrationData.jerseyModel || null, // Save Jersey selection
                jerseySize: registrationData.jerseySize || null
            };

            if (existingRegDoc) {
                transaction.update(existingRegDoc.ref, registrationPayload);
            } else {
                const newRegRef = db.collection('event-registrations').doc();
                transaction.set(newRegRef, registrationPayload);
            }

            if (registrationData.bloodType || registrationData.insuranceInfo || registrationData.allergies) {
                const userRef = db.collection('users').doc(userId);
                const updateData: any = {};
                if (registrationData.bloodType) updateData.bloodType = registrationData.bloodType;
                if (registrationData.insuranceInfo) updateData.insuranceInfo = registrationData.insuranceInfo;
                if (registrationData.allergies) updateData.allergies = registrationData.allergies;
                transaction.update(userRef, updateData);
            }

            transaction.update(eventRef, {
                currentParticipants: currentParticipants + 1
            });

            return { success: true, message: "¡Registro exitoso!" };
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
            const regData = doc.data();
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
            
            let price = regData.price;
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
                
                // Add bib number mapping
                bibNumber: regData.bibNumber || null,
                
                // Add jersey mapping
                jerseyModel: regData.jerseyModel || null,
                jerseySize: regData.jerseySize || null,
                
                emergencyContactName: areEmergencyDetailsHidden ? '***' : (regData.emergencyContactName || null),
                emergencyContactPhone: areEmergencyDetailsHidden ? '***' : (regData.emergencyContactPhone || null),
                bloodType: areEmergencyDetailsHidden ? '***' : (regData.bloodType || null),
                insuranceInfo: areEmergencyDetailsHidden ? '***' : (regData.insuranceInfo || null),
                allergies: areEmergencyDetailsHidden ? '***' : (regData.allergies || null),
                waiverSigned: !!regData.waiverSignature,
            } as EventAttendee;
        });

        const attendees = await Promise.all(attendeesPromises);
        return attendees.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());

    } catch (error) {
        console.error("Error fetching event attendees:", error);
        return [];
    }
}
