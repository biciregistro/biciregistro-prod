
import 'server-only';
import { FieldValue, Timestamp, FieldPath } from 'firebase-admin/firestore';
import { unstable_cache } from 'next/cache';
import type { User, OngUser, Bike, BikeStatus, HomepageSection, UserRole, Event, EventRegistration, UserEventRegistration } from './types';
import { getDecodedSession } from '@/lib/auth';
import { adminDb, adminAuth } from './firebase/server';
import { defaultHomepageData } from './homepage-data';
import { UserRecord } from 'firebase-admin/auth';
import { 
    getUser, 
    getEvent, 
    getBike, 
    convertBikeTimestamps, 
    convertEventTimestamps 
} from './data/core';

// Re-export core functions to maintain public API and resolve circular dependencies
export { getUser, getEvent, getBike };

// Export from sub-modules to keep this file clean
export { registerUserToEvent, getEventAttendees } from './data/event-registration-data';

// --- Helper Functions ---

const normalizeSerialNumber = (serial: string): string => {
    return serial.replace(/[\s-]+/g, '').toUpperCase();
};

const formatUserRecord = (userRecord: UserRecord): User => {
    const isAdmin = userRecord.customClaims?.admin === true;
    const displayName = userRecord.displayName || "";
    const nameParts = displayName.split(" ");
    const name = nameParts.shift() || userRecord.email?.split("@")[0] || "N/A";
    const lastName = nameParts.join(" ");

    return {
        id: userRecord.uid,
        email: userRecord.email || "No email",
        name,
        lastName,
        role: isAdmin ? "admin" : "ciclista",
    };
};

export async function isSerialNumberUnique(serial: string, excludeBikeId?: string): Promise<boolean> {
    const normalizedSerial = normalizeSerialNumber(serial);
    const db = adminDb;
    const bikesRef = db.collection('bikes');
    const query = bikesRef.where('serialNumber', '==', normalizedSerial);
    
    const snapshot = await query.get();

    if (snapshot.empty) {
        return true;
    }

    if (excludeBikeId) {
        return snapshot.docs.length === 1 && snapshot.docs[0].id === excludeBikeId;
    }

    return false;
}

// --- User Management ---

export async function getAuthenticatedUser(): Promise<User | null> {
    const session = await getDecodedSession();
    if (!session?.uid) return null;
    try {
        const db = adminDb;
        const userDoc = await db.collection('users').doc(session.uid).get();

        if (userDoc.exists) {
            return { id: userDoc.id, ...userDoc.data() } as User;
        }

        const firebaseUser = await adminAuth.getUser(session.uid);
        const userRole = (session.role as UserRole) || 'ciclista';

        if (userRole === 'ong') {
            // FIX: Self-healing logic for old ONG profiles.
            // If the user document doesn't exist but the user is an ONG,
            // try to fetch the profile from 'ong-profiles' and recreate the 'users' doc.
            const ongProfile = await getOngProfile(session.uid);
            
            if (ongProfile) {
                console.log(`[Self-Healing] Creating missing 'users' doc for ONG: ${session.uid}`);
                
                const recoveredUser: User = {
                    id: firebaseUser.uid,
                    email: firebaseUser.email!,
                    name: ongProfile.organizationName, // Use the correct name from profile
                    lastName: '', // ONGs usually don't have last names in this context
                    role: 'ong',
                    avatarUrl: ongProfile.logoUrl,
                    createdAt: new Date().toISOString(),
                };
                
                // Save the recovered document
                await db.collection('users').doc(recoveredUser.id).set(recoveredUser);
                
                return recoveredUser;
            }
            
            // Fallback for completely broken state (should happen rarely)
            const tempUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email!,
                name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
                lastName: '',
                role: userRole,
            };
            return tempUser;
        }

        if (userRole === 'admin') {
            const tempUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email!,
                name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
                lastName: '',
                role: userRole,
            };
            return tempUser;
        }

        const newUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
            lastName: '',
            role: 'ciclista',
        };
        await db.collection('users').doc(newUser.id).set(newUser);
        return newUser;

    } catch (error) {
        console.error("Failed to fetch authenticated user:", error);
        return null;
    }
}

export async function getUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    try {
        const db = adminDb;
        const usersRef = db.collection('users');
        const q = usersRef.where('email', '==', email).limit(1);
        const querySnapshot = await q.get();
        if (querySnapshot.empty) return null;
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() } as User;
    } catch (error) {
        console.error("Error fetching user by email:", error);
        return null;
    }
}

export async function createUser(user: User) {
    const db = adminDb;
    await db.collection('users').doc(user.id).set(user);
}

export async function createOngFirestoreProfile(ongData: Omit<OngUser, 'role' | 'email'>) {
    const db = adminDb;
    await db.collection('ong-profiles').doc(ongData.id).set(ongData);
}

export async function updateUserData(userId: string, data: Partial<Omit<User, 'id' | 'role' | 'email'>>) {
    const db = adminDb;
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    if (Object.keys(cleanData).length > 0) {
        await db.collection('users').doc(userId).update(cleanData);
    }
}

// --- ONG / Community Management ---
export async function getOngProfile(id: string): Promise<Omit<OngUser, 'email' | 'role'> | null> {
    try {
        const db = adminDb;
        const docSnap = await db.collection('ong-profiles').doc(id).get();
        if (!docSnap.exists) {
            return null;
        }
        return docSnap.data() as Omit<OngUser, 'email' | 'role'>;
    } catch (error) {
        console.error("Error fetching ONG profile:", error);
        return null;
    }
}

export async function getOngFollowersCount(ongId: string): Promise<number> {
    if (!ongId) return 0;
    try {
        const db = adminDb;
        const query = db.collection('users').where('communityId', '==', ongId);
        const snapshot = await query.count().get();
        return snapshot.data().count;
    } catch (error) {
        console.error("Error counting ONG followers:", error);
        return 0;
    }
}

// --- Admin User Management ---
export async function getUsers({
  query,
  maxResults = 100,
  pageToken,
}: {
  query?: string;
  maxResults?: number;
  pageToken?: string;
}): Promise<{ users: User[]; nextPageToken?: string }> {
  try {
    if (query) {
      try {
        const userRecord = await adminAuth.getUserByEmail(query);
        return { users: [formatUserRecord(userRecord)] };
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          return { users: [] };
        }
        throw error;
      }
    } else {
      const userRecords = await adminAuth.listUsers(maxResults, pageToken);
      const users = userRecords.users.map(formatUserRecord);
      return {
        users,
        nextPageToken: userRecords.pageToken,
      };
    }
  } catch (error) {
    console.error("Error listing users:", error);
    return { users: [] };
  }
}

export async function getOngUsers(): Promise<OngUser[]> {
    try {
        const db = adminDb;
        const snapshot = await db.collection('ong-profiles').get();
        if (snapshot.empty) {
            return [];
        }
        const ongProfiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Omit<OngUser, 'email' | 'role'>));
        
        const ongUsersWithEmails: OngUser[] = await Promise.all(
            ongProfiles.map(async (profile) => {
                const userRecord = await adminAuth.getUser(profile.id);
                return {
                    ...profile,
                    email: userRecord.email || 'No email provided',
                    role: 'ong',
                };
            })
        );
        return ongUsersWithEmails;
    } catch (error) {
        console.error("Error fetching ONG users:", error);
        return [];
    }
}

// --- Bike Management ---
export async function getBikes(userId: string): Promise<Bike[]> {
    if (!userId) return [];
    const db = adminDb;
    let query = db.collection('bikes').where('userId', '==', userId);
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...convertBikeTimestamps(doc.data()) } as Bike));
}

export async function getBikeBySerial(serial: string): Promise<Bike | null> {
    const normalizedSerial = normalizeSerialNumber(serial);
    const db = adminDb;
    const bikesRef = db.collection('bikes');
    const query = bikesRef.where('serialNumber', '==', normalizedSerial).limit(1);
    const snapshot = await query.get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...convertBikeTimestamps(doc.data()) } as Bike;
}

export async function getAllBikeSerials(): Promise<string[]> {
    const db = adminDb;
    const bikesRef = db.collection('bikes');
    const snapshot = await bikesRef.select('serialNumber').get();
    if (snapshot.empty) {
        return [];
    }
    const serials = new Set(snapshot.docs.map(doc => doc.data().serialNumber as string));
    return Array.from(serials);
}

export async function addBike(bikeData: Omit<Bike, 'id' | 'createdAt' | 'status'>) {
    const db = adminDb;
    const newBike = {
        ...bikeData,
        serialNumber: normalizeSerialNumber(bikeData.serialNumber),
        status: 'safe' as const,
        createdAt: FieldValue.serverTimestamp(),
    };
    await db.collection('bikes').add(newBike);
}

export async function updateBikeData(bikeId: string, data: Partial<Omit<Bike, 'id'>>) {
    const db = adminDb;
    const dataToUpdate = { ...data };
    if (data.serialNumber) {
        dataToUpdate.serialNumber = normalizeSerialNumber(data.serialNumber);
    }
    const cleanData = Object.fromEntries(Object.entries(dataToUpdate).filter(([_, v]) => v !== undefined));
    await db.collection('bikes').doc(bikeId).update(cleanData);
}

export async function updateBikeStatus(bikeId: string, status: BikeStatus, theftDetails?: Bike['theftReport']) {
    const db = adminDb;
    const updateData: any = { status };
    if (status === 'stolen') {
        updateData.theftReport = theftDetails;
    } else {
        updateData.theftReport = FieldValue.delete();
    }
    await db.collection('bikes').doc(bikeId).update(updateData);
}

// --- Event Management ---
export async function getEventsByOngId(ongId: string): Promise<Event[]> {
    if (!ongId) return [];
    const db = adminDb;
    const query = db.collection('events').where('ongId', '==', ongId);
    const snapshot = await query.orderBy('date', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...convertEventTimestamps(doc.data()) } as Event));
}

export async function createEvent(eventData: Omit<Event, 'id'>): Promise<string> {
    const db = adminDb;
    const docRef = await db.collection('events').add({
        ...eventData,
        date: Timestamp.fromDate(new Date(eventData.date)),
    });
    return docRef.id;
}

export async function updateEvent(eventId: string, eventData: Partial<Omit<Event, 'id' | 'ongId'>>) {
    const db = adminDb;
    const dataToUpdate = { ...eventData };

    if (eventData.date) {
        dataToUpdate.date = Timestamp.fromDate(new Date(eventData.date)) as any;
    }

    const cleanData = Object.fromEntries(Object.entries(dataToUpdate).filter(([_, v]) => v !== undefined));

    await db.collection('events').doc(eventId).update(cleanData);
}

// --- Homepage Content Management ---
export async function getHomepageData(): Promise<{ [key: string]: HomepageSection }> {
    const db = adminDb;
    const snapshot = await db.collection('homepage').get();
    
    if (snapshot.empty) {
        return defaultHomepageData;
    }
    
    const sectionsFromDb: { [key: string]: Partial<HomepageSection> } = {};
    snapshot.forEach(doc => {
        sectionsFromDb[doc.id] = doc.data();
    });

    // Merge DB data on top of defaults to ensure new sections are included
    const mergedData = { ...defaultHomepageData };
    for (const key in sectionsFromDb) {
        if (Object.prototype.hasOwnProperty.call(mergedData, key)) {
            // Shallow merge is not enough for sections with arrays like 'features' or 'items'
            // We need to merge them correctly.
            const dbSection = sectionsFromDb[key];
            const defaultSection = mergedData[key];
            mergedData[key] = { ...defaultSection, ...dbSection } as HomepageSection;
        } else {
            mergedData[key] = sectionsFromDb[key] as HomepageSection;
        }
    }
    
    return mergedData;
}

export async function updateHomepageSectionData(data: HomepageSection) {
    const db = adminDb;
    const { id, ...sectionData } = data;
    await db.collection('homepage').doc(id).set(sectionData, { merge: true });
}

// --- Event Registration ---
export async function getUserRegistrationForEvent(userId: string, eventId: string): Promise<any | null> {
    if (!userId || !eventId) return null;
    try {
        const db = adminDb;
        const query = db.collection('event-registrations')
            .where('userId', '==', userId)
            .where('eventId', '==', eventId)
            .limit(1);
        
        const snapshot = await query.get();
        if (snapshot.empty) return null;
        
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    } catch (error) {
        console.error("Error fetching registration:", error);
        return null;
    }
}

export async function updateEventRegistrationBike(eventId: string, userId: string, bikeId: string): Promise<{ success: boolean; error?: string }> {
    const db = adminDb;
    try {
        const query = db.collection('event-registrations')
            .where('userId', '==', userId)
            .where('eventId', '==', eventId)
            .limit(1);
        
        const snapshot = await query.get();
        if (snapshot.empty) {
            return { success: false, error: "No se encontró el registro." };
        }
        
        const regDoc = snapshot.docs[0];
        await regDoc.ref.update({ bikeId });
        
        return { success: true };
    } catch (error) {
        console.error("Error updating registration bike:", error);
        return { success: false, error: "No se pudo vincular la bicicleta." };
    }
}

export async function cancelEventRegistration(eventId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const db = adminDb;
    try {
        return await db.runTransaction(async (transaction) => {
            const eventRef = db.collection('events').doc(eventId);
            
            const query = db.collection('event-registrations')
                .where('userId', '==', userId)
                .where('eventId', '==', eventId)
                .limit(1);
            
            const snapshot = await transaction.get(query);
            if (snapshot.empty) {
                return { success: false, error: "No se encontró el registro." };
            }
            
            const regDoc = snapshot.docs[0];
            const registration = regDoc.data() as EventRegistration;

            if (registration.status === 'cancelled') {
                return { success: false, error: "La inscripción ya está cancelada." };
            }

            const eventDoc = await transaction.get(eventRef);
            if (!eventDoc.exists) {
                 return { success: false, error: "El evento no existe." };
            }
            const currentParticipants = eventDoc.data()?.currentParticipants || 0;

            transaction.update(regDoc.ref, { status: 'cancelled' });

            const newCount = Math.max(0, currentParticipants - 1);
            transaction.update(eventRef, { currentParticipants: newCount });

            return { success: true };
        });
    } catch (error) {
        console.error("Error cancelling registration:", error);
        return { success: false, error: "Error al cancelar la inscripción." };
    }
}

export async function cancelEventRegistrationById(eventId: string, registrationId: string): Promise<{ success: boolean; error?: string }> {
    const db = adminDb;
    try {
        return await db.runTransaction(async (transaction) => {
            const eventRef = db.collection('events').doc(eventId);
            const regRef = db.collection('event-registrations').doc(registrationId);
            
            const regDoc = await transaction.get(regRef);
            if (!regDoc.exists) {
                return { success: false, error: "No se encontró el registro." };
            }
            
            const registration = regDoc.data() as EventRegistration;

            if (registration.eventId !== eventId) {
                return { success: false, error: "El registro no pertenece a este evento." };
            }

            if (registration.status === 'cancelled') {
                return { success: false, error: "La inscripción ya está cancelada." };
            }

            const eventDoc = await transaction.get(eventRef);
            if (!eventDoc.exists) {
                 return { success: false, error: "El evento no existe." };
            }
            const currentParticipants = eventDoc.data()?.currentParticipants || 0;

            transaction.update(regRef, { status: 'cancelled' });

            const newCount = Math.max(0, currentParticipants - 1);
            transaction.update(eventRef, { currentParticipants: newCount });

            return { success: true };
        });
    } catch (error) {
        console.error("Error cancelling registration by ID:", error);
        return { success: false, error: "Error al cancelar la inscripción." };
    }
}

export async function updateRegistrationStatusInternal(
    registrationId: string, 
    data: { paymentStatus?: string, checkedIn?: boolean }
) {
    const db = adminDb;
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    
    if (data.checkedIn === true) {
        (cleanData as any).checkedInAt = new Date().toISOString();
    }
    
    await db.collection('event-registrations').doc(registrationId).update(cleanData);
}

export async function getUserEventRegistrations(userId: string): Promise<UserEventRegistration[]> {
    if (!userId) return [];
    try {
        const db = adminDb;
        const registrationsSnapshot = await db.collection('event-registrations')
            .where('userId', '==', userId)
            .get();

        if (registrationsSnapshot.empty) return [];

        const registrations = registrationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventRegistration));

        const registrationsWithEvents = await Promise.all(registrations.map(async (reg) => {
            const event = await getEvent(reg.eventId);
            if (!event) return null;
            return { ...reg, event };
        }));

        const validRegistrations = registrationsWithEvents.filter((r): r is UserEventRegistration => r !== null);
        
        return validRegistrations.sort((a, b) => 
            new Date(a.event.date).getTime() - new Date(b.event.date).getTime()
        );

    } catch (error) {
        console.error("Error fetching user event registrations:", error);
        return [];
    }
}

// MODIFIED: This function will now ONLY fetch DIRECT members.
export async function getOngCommunityMembers(ongId: string): Promise<any[]> {
    if (!ongId) return [];
    try {
        const db = adminDb;
        const members: any[] = [];

        const directUsersSnapshot = await db.collection('users')
            .where('communityId', '==', ongId)
            .get();
        
        if (directUsersSnapshot.empty) {
            return [];
        }

        directUsersSnapshot.forEach(doc => {
            const userData = doc.data();
            members.push({
                id: doc.id,
                name: userData.name,
                lastName: userData.lastName,
                email: userData.email,
                whatsapp: userData.whatsapp,
                country: userData.country,
                state: userData.state,
            });
        });

        return members;

    } catch (error) {
        console.error("Error fetching community members:", error);
        return [];
    }
}


async function _getOngCommunityCountLogic(ongId: string): Promise<number> {
    if (!ongId) return 0;
    try {
        const db = adminDb;
        const userIds = new Set<string>();

        const directUsersSnapshot = await db.collection('users')
            .where('communityId', '==', ongId)
            .select() 
            .get();
        
        directUsersSnapshot.forEach(doc => userIds.add(doc.id));

        const events = await getEventsByOngId(ongId);
        const eventIds = events.map(e => e.id);

        if (eventIds.length > 0) {
             for (let i = 0; i < eventIds.length; i += 10) {
                 const chunk = eventIds.slice(i, i + 10);
                 const registrationsSnapshot = await db.collection('event-registrations')
                    .where('eventId', 'in', chunk)
                    .select('userId')
                    .get();
                 registrationsSnapshot.forEach(doc => {
                     const data = doc.data();
                     if (data.userId) userIds.add(data.userId);
                 });
             }
        }

        return userIds.size;

    } catch (error) {
        console.error("Error counting community members:", error);
        return 0;
    }
}

export const getOngCommunityCount = unstable_cache(
    async (ongId: string) => _getOngCommunityCountLogic(ongId),
    ['ong-community-count'],
    { revalidate: 3600, tags: ['community-count'] }
);
