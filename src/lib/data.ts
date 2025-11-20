import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { User, OngUser, Bike, BikeStatus, HomepageSection, UserRole } from './types';
import { getDecodedSession } from '@/lib/auth';
import { adminDb, adminAuth } from './firebase/server';
import { defaultHomepageData } from './homepage-data';
import { firebaseConfig } from './firebase/config';
import { UserRecord } from 'firebase-admin/auth';

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

        // If a user document exists in 'users' collection, return it directly.
        // This handles all ciclistas and any admins/ongs that might have a doc for other reasons.
        if (userDoc.exists) {
            return { id: userDoc.id, ...userDoc.data() } as User;
        }

        // If no user document exists, handle different user roles based on session claims.
        const firebaseUser = await adminAuth.getUser(session.uid);
        const userRole = (session.role as UserRole) || 'ciclista';

        // For 'ong' or 'admin' roles that don't have a user document,
        // we construct a user object in memory without writing to the 'users' collection.
        if (userRole === 'ong' || userRole === 'admin') {
            const tempUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email!,
                name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
                lastName: '',
                role: userRole,
            };
            return tempUser;
        }

        // For any other role (implicitly 'ciclista'), create a default user document
        // This maintains the original "self-healing" functionality for ciclistas.
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

export async function getUser(userId: string): Promise<User | null> {
    if (!userId) return null;
    try {
        const db = adminDb;
        const docSnap = await db.collection('users').doc(userId).get();
        return docSnap.exists ? { id: docSnap.id, ...docSnap.data() } as User : null;
    } catch (error) {
        console.error("Error fetching user:", error);
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
          return { users: [] }; // Return empty if no user is found
        }
        throw error; // Re-throw other errors
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
        // We need to fetch the email for each ONG user from Firebase Auth
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

// --- Data Serialization Helper ---
const convertDocTimestamps = (data: any): any => {
    if (!data) return data;
    const convertedData = { ...data };
    if (convertedData.createdAt instanceof Timestamp) {
        convertedData.createdAt = convertedData.createdAt.toDate().toISOString();
    }
    if (convertedData.theftReport?.date instanceof Timestamp) {
        convertedData.theftReport.date = convertedData.theftReport.date.toDate().toISOString();
    }
    return convertedData;
};

// --- Bike Management ---
export async function getBikes(userId: string): Promise<Bike[]> {
    if (!userId) return [];
    const db = adminDb;
    let query = db.collection('bikes').where('userId', '==', userId);
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...convertDocTimestamps(doc.data()) } as Bike));
}

// Corrected getBike function to accept userId and perform security check
export async function getBike(userId: string, bikeId: string): Promise<Bike | null> {
    if (!userId || !bikeId) return null;
    try {
        const db = adminDb;
        const docSnap = await db.collection('bikes').doc(bikeId).get();

        if (!docSnap.exists) {
            return null;
        }

        const bikeData = docSnap.data() as Bike;

        // Security check: Ensure the bike belongs to the requesting user.
        if (bikeData.userId !== userId) {
            console.warn(`Security warning: User ${userId} attempted to access bike ${bikeId} owned by ${bikeData.userId}.`);
            return null;
        }

        return { id: docSnap.id, ...convertDocTimestamps(bikeData) } as Bike;
    } catch (error) {
        console.error("Error fetching bike:", error);
        return null;
    }
}

export async function getBikeBySerial(serial: string): Promise<Bike | null> {
    const normalizedSerial = normalizeSerialNumber(serial);
    const db = adminDb;
    const bikesRef = db.collection('bikes');
    const query = bikesRef.where('serialNumber', '==', normalizedSerial).limit(1);
    const snapshot = await query.get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...convertDocTimestamps(doc.data()) } as Bike;
}

export async function getAllBikeSerials(): Promise<string[]> {
    const db = adminDb;
    const bikesRef = db.collection('bikes');
    // Select only the serialNumber field for efficiency
    const snapshot = await bikesRef.select('serialNumber').get();
    if (snapshot.empty) {
        return [];
    }
    // Use a Set to automatically handle any potential duplicates, then convert to array
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
    // Filter out undefined values before updating
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

// --- Homepage Content Management ---
export async function getHomepageData(): Promise<{ [key: string]: HomepageSection }> {
    const db = adminDb;
    const snapshot = await db.collection('homepage').get();
    if (snapshot.empty) {
        return defaultHomepageData;
    }
    const sections: { [key: string]: HomepageSection } = {};
    snapshot.forEach(doc => {
        sections[doc.id] = doc.data() as HomepageSection;
    });
    return sections;
}

export async function updateHomepageSectionData(data: HomepageSection) {
    const db = adminDb;
    const { id, ...sectionData } = data;
    await db.collection('homepage').doc(id).set(sectionData, { merge: true });
}
