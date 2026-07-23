import 'server-only';
import { adminDb } from '../firebase/server';
import { getUser, getEvent, getBike, getDependent } from './core'; 
import { EventRegistration, EventAttendee, MarketingConsent, CostTier, Event, SerialCompetitor, User } from '../types';
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
    customAnswers?: Record<string, string | string[]>; 
};

export async function registerUserToEvent(
    registrationData: RegistrationInput
): Promise<{ success: true; registrationId: string; message: string } | { success: false; error: string }> {
    const db = adminDb;
    const { eventId, userId, dependentId } = registrationData;

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

            // MODIFIED: Uniqueness check for dependents
            let regQuery;
            if (dependentId) {
                // For a minor, the registration is unique for that dependent in that event.
                regQuery = db.collection('event-registrations')
                    .where('eventId', '==', eventId)
                    .where('dependentId', '==', dependentId)
                    .limit(1);
            } else {
                // For an adult, it's unique for their own user ID in that event.
                regQuery = db.collection('event-registrations')
                    .where('userId', '==', userId)
                    .where('eventId', '==', eventId)
                    .where('dependentId', '==', null) // Explicitly check that it's not a dependent registration
                    .limit(1);
            }
            
            const regSnapshot = await transaction.get(regQuery);
            let existingRegDoc = null;
            
            if (!regSnapshot.empty) {
                const doc = regSnapshot.docs[0];
                const data = doc.data() as EventRegistration;
                if (data.status === 'cancelled') {
                    existingRegDoc = doc; // Allow re-registration if cancelled
                } else {
                     return { success: false, error: "El participante ya se encuentra registrado en este evento." };
                }
            }

            // --- TIER VALIDATION ---
            let selectedTier: CostTier | undefined;
            let updatedCostTiers: CostTier[] | undefined;
            
            if (registrationData.tierId && eventData.costTiers) {
                const tierIndex = eventData.costTiers.findIndex(t => t.id === registrationData.tierId);
                
                if (tierIndex !== -1) {
                    selectedTier = eventData.costTiers[tierIndex];
                    
                    const limit = selectedTier.limit || 0;
                    const sold = selectedTier.soldCount || 0;
                    
                    if (limit > 0 && sold >= limit) {
                        return { success: false, error: `El nivel "${selectedTier.name}" se ha agotado.` };
                    }

                    updatedCostTiers = [...eventData.costTiers];
                    updatedCostTiers[tierIndex] = {
                        ...selectedTier,
                        soldCount: sold + 1
                    };
                }
            }

            let paymentStatus: 'pending' | 'paid' | 'not_applicable' | 'cancelled' = 'pending';
            const price = selectedTier?.price ?? 0;

            if (eventData.costType === 'Gratuito' || price === 0) {
                paymentStatus = eventData.costType === 'Gratuito' ? 'not_applicable' : 'paid';
            }

            const financialSnapshot = selectedTier ? {
                amountPaid: selectedTier.price,
                platformFee: selectedTier.fee || 0,
                organizerNet: selectedTier.netPrice ?? selectedTier.price,
                isFeeAbsorbed: !!selectedTier.absorbFee,
                calculatedAt: new Date().toISOString()
            } : undefined;

            let assignedBibNumber = null;
            
            // --- SERIAL INTEGRATION: BIB NUMBER ASSIGNMENT ---
            if (eventData.serialId && eventData.isSerialStage) {
                 const serialParticipantId = dependentId || userId;
                 const serialRegRef = db.collection('serial_registrations').doc(`${eventData.serialId}_${serialParticipantId}`);
                 const serialCounterRef = db.collection('serial_bib_counters').doc(eventData.serialId);
                 
                 const serialRegDoc = await transaction.get(serialRegRef);
                 if (serialRegDoc.exists && typeof serialRegDoc.data()?.bibNumber === 'number') {
                     assignedBibNumber = serialRegDoc.data()?.bibNumber;
                 } else {
                     const counterDoc = await transaction.get(serialCounterRef);
                     let nextBib = 1;
                     if (counterDoc.exists) {
                         nextBib = (counterDoc.data()?.currentNumber || 0) + 1;
                         transaction.update(serialCounterRef, { currentNumber: nextBib });
                     } else {
                         transaction.set(serialCounterRef, { currentNumber: nextBib });
                     }
                     
                     transaction.set(serialRegRef, {
                         userId: serialParticipantId,
                         serialId: eventData.serialId,
                         bibNumber: nextBib,
                         assignedAt: new Date().toISOString()
                     });
                     assignedBibNumber = nextBib;
                 }
            } else if (
                (paymentStatus === 'not_applicable' || paymentStatus === 'paid') && 
                eventData.bibNumberConfig?.enabled && 
                eventData.bibNumberConfig.mode === 'automatic'
            ) {
                // Normal Event Bib Assignment
                assignedBibNumber = eventData.bibNumberConfig.nextNumber || 1;
                transaction.update(eventRef, { 'bibNumberConfig.nextNumber': assignedBibNumber + 1 });
            }

            const registrationPayload = {
                ...registrationData,
                price: price, 
                financialSnapshot,
                bloodType: registrationData.bloodType || null,
                insuranceInfo: registrationData.insuranceInfo || null,
                allergies: registrationData.allergies || null,
                emergencyContactName: registrationData.emergencyContactName || null,
                emergencyContactPhone: registrationData.emergencyContactPhone || null,
                registrationDate: new Date().toISOString(), 
                status: 'confirmed' as const,
                paymentStatus: paymentStatus as any,
                checkedIn: false,
                marketingConsent: registrationData.marketingConsent || null,
                bibNumber: assignedBibNumber,
                jerseyModel: registrationData.jerseyModel || null,
                jerseySize: registrationData.jerseySize || null,
                customAnswers: registrationData.customAnswers || {},
                // Minor registration specific fields
                isMinorRegistration: !!dependentId,
                dependentId: dependentId || null, // Ensure it's null, not undefined
                tutorId: dependentId ? userId : null,
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

            // --- SERIAL INTEGRATION: DENORMALIZATION (syncSerialCompetitor) ---
            if (eventData.serialId) {
                const participantId = dependentId || userId;
                const userDoc = await transaction.get(db.collection('users').doc(participantId));
                const userData = userDoc.exists ? userDoc.data() as User : null;
                
                const competitorRef = db.collection('serial_competitors').doc(`${eventData.serialId}_${participantId}`);
                const competitorDoc = await transaction.get(competitorRef);
                
                // Get Category Name safely
                let categoryName = 'General';
                if (registrationData.categoryId && eventData.categories) {
                    const cat = eventData.categories.find(c => c.id === registrationData.categoryId);
                    if (cat) categoryName = cat.name;
                }

                const stageUpdateData = {
                    stageOrder: eventData.stageOrder || 1,
                    eventName: eventData.name,
                    isRegistered: true,
                    paymentStatus: paymentStatus,
                    waiverSigned: !!registrationData.waiverSignature,
                    checkedIn: false
                };

                if (competitorDoc.exists) {
                    transaction.update(competitorRef, {
                        [`stages.${eventId}`]: stageUpdateData,
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    const newCompetitorPayload: SerialCompetitor = {
                        id: `${eventData.serialId}_${participantId}`,
                        serialId: eventData.serialId,
                        userId: participantId,
                        userName: userData ? `${userData.name} ${userData.lastName || ''}`.trim() : 'Usuario',
                        userEmail: userData?.email || '',
                        userAvatar: userData?.avatarUrl || '',
                        bibNumber: assignedBibNumber,
                        categoryId: registrationData.categoryId || 'default',
                        categoryName: categoryName,
                        affiliationId: registrationData.affiliationId || '',
                        stages: {
                            [eventId]: stageUpdateData
                        },
                        totalPoints: 0,
                        overallPosition: 0,
                        stagesCompleted: 0,
                        updatedAt: new Date().toISOString()
                    };
                    transaction.set(competitorRef, newCompetitorPayload);
                }
            }
            // ------------------------------------------------------------------

            // --- UPDATE USER PROFILE WITH EMERGENCY DATA ---
            // This data belongs to the tutor, so it's always updated on the userId
            if (
                registrationData.bloodType || 
                registrationData.insuranceInfo || 
                registrationData.allergies || 
                registrationData.emergencyContactName || 
                registrationData.emergencyContactPhone
            ) {
                const userRef = db.collection('users').doc(userId);
                const updateData: any = {};
                if (registrationData.bloodType) updateData.bloodType = registrationData.bloodType;
                if (registrationData.insuranceInfo) updateData.insuranceInfo = registrationData.insuranceInfo;
                if (registrationData.allergies) updateData.allergies = registrationData.allergies;
                if (registrationData.emergencyContactName) updateData.emergencyContactName = registrationData.emergencyContactName;
                if (registrationData.emergencyContactPhone) updateData.emergencyContactPhone = registrationData.emergencyContactPhone;
                
                transaction.update(userRef, updateData);
            }
            // ------------------------------------------------

            const eventUpdate: any = {
                currentParticipants: currentParticipants + 1
            };

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

            let participantName: string | undefined;
            let participantLastName: string | undefined;
            let participantGender: string | null | undefined;
            let participantBirthDate: Date | string | null | undefined;
            let contactUser: User | null;
            const isMinor = !!(regData.dependentId && regData.tutorId);

            if (isMinor) {
                const dependent = await getDependent(regData.tutorId!, regData.dependentId!);
                contactUser = await getUser(regData.tutorId!);
                
                participantName = dependent?.firstName;
                participantLastName = dependent?.lastName;
                participantGender = dependent?.gender;
                participantBirthDate = dependent?.dateOfBirth;
            } else {
                contactUser = await getUser(regData.userId);
                
                participantName = contactUser?.name;
                participantLastName = contactUser?.lastName;
                participantGender = contactUser?.gender;
                participantBirthDate = contactUser?.birthDate;
            }
            
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
                name: participantName || 'Participante',
                lastName: participantLastName || 'Anónimo',
                email: contactUser?.email || '',
                whatsapp: contactUser?.whatsapp,
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
                
                emergencyContactName: areEmergencyDetailsHidden ? '***' : (contactUser?.emergencyContactName || regData.emergencyContactName || null),
                emergencyContactPhone: areEmergencyDetailsHidden ? '***' : (contactUser?.emergencyContactPhone || regData.emergencyContactPhone || null),
                bloodType: areEmergencyDetailsHidden ? '***' : (contactUser?.bloodType || regData.bloodType || null),
                insuranceInfo: areEmergencyDetailsHidden ? '***' : (contactUser?.insuranceInfo || regData.insuranceInfo || null),
                allergies: areEmergencyDetailsHidden ? '***' : (contactUser?.allergies || regData.allergies || null),
                
                waiverSigned: !!regData.waiverSignature,
                customAnswers: regData.customAnswers || {}, 
                
                gender: participantGender || null,
                birthDate: participantBirthDate || null,

                isMinorRegistration: isMinor,
                dependentId: regData.dependentId,
                tutorId: regData.tutorId,
                
                country: contactUser?.country || null,
                state: contactUser?.state || null,
                city: contactUser?.city || null,
            } as EventAttendee;
        });

        const attendees = await Promise.all(attendeesPromises);
        return attendees.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());

        } catch (error) {
        console.error("Error fetching event attendees:", error);
        return [];
        }
}

        /**
        * Recupera TODAS las inscripciones que un usuario ha realizado para un evento específico,
        * incluyendo las propias y las de sus dependientes.
        */
        export async function getRegistrationsForUserInEvent(userId: string, eventId: string): Promise<EventRegistration[]> {
        noStore();
        if (!userId || !eventId) return [];

        try {
        const db = adminDb;
        // El campo `userId` siempre se refiere al usuario que realizó la acción (el tutor).
        // Esta única consulta es suficiente para obtener todas las inscripciones relevantes.
        const registrationsSnapshot = await db.collection('event-registrations')
            .where('eventId', '==', eventId)
            .where('userId', '==', userId) // Clave: Trae todas las inscripciones del usuario para el evento
            .orderBy('registrationDate', 'asc') // Ordenar para una visualización consistente
            .get();

        if (registrationsSnapshot.empty) {
            return [];
        }

        const registrations: EventRegistration[] = [];
        registrationsSnapshot.forEach(doc => {
            registrations.push({ id: doc.id, ...doc.data() } as EventRegistration);
        });

        return registrations;
        } catch (error) {
        console.error("Error fetching registrations for user in event:", error);
        return [];
        }
        }