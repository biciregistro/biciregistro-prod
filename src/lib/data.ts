import 'server-only';
import { getFirestore, FieldValue, Filter, Timestamp } from 'firebase-admin/firestore';
import { firebaseConfig } from './firebase/config';
import type { User, Bike, BikeStatus, HomepageSection } from './types';
import { getDecodedSession } from '@/lib/auth';
import { adminAuth } from './firebase/server';

// --- Helper Functions ---

// Normalizes a serial number for consistent storage and lookup.
const normalizeSerialNumber = (serial: string): string => {
    return serial.replace(/[\s-]+/g, '').toUpperCase();
};

// Checks if a serial number is unique, optionally excluding a specific bike ID.
export async function isSerialNumberUnique(serial: string, excludeBikeId?: string): Promise<boolean> {
    const normalizedSerial = normalizeSerialNumber(serial);
    const db = getFirestore();
    const bikesRef = db.collection('bikes');
    const query = bikesRef.where('serialNumber', '==', normalizedSerial);
    
    const snapshot = await query.get();

    if (snapshot.empty) {
        return true; // No bike with this serial number found.
    }

    // If we need to exclude a bike ID (for updates), check if the found bike is the one we're excluding.
    if (excludeBikeId) {
        // If there is only one match and its ID is the one we want to exclude, then the serial is unique for other records.
        return snapshot.docs.length === 1 && snapshot.docs[0].id === excludeBikeId;
    }

    // If not excluding any ID, and we found docs, it's a duplicate.
    return false;
}

// Helper function to verify a user's password
export async function verifyUserPassword(email: string, password_provided: string): Promise<boolean> {
    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`;

    try {
        const response = await fetch(signInUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                password: password_provided,
                returnSecureToken: false, 
            }),
        });
        return response.ok;
    } catch (error) {
        console.error("Error verifying password:", error);
        return false;
    }
}

// --- User Management ---

export async function getAuthenticatedUser(): Promise<User | null> {
    const session = await getDecodedSession();
    if (!session?.uid) return null;
    try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(session.uid).get();
        if (!userDoc.exists) {
            console.warn(`User document not found for UID: ${session.uid}`);
            // Attempt to self-heal by creating the user document
            const firebaseUser = await adminAuth.getUser(session.uid);
            const newUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email!,
                name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
                lastName: '', // Default empty value
                role: 'ciclista', // FIX: Assign the correct default role
            };
            await db.collection('users').doc(newUser.id).set(newUser);
            console.log(`Self-healing: Created user document for UID: ${newUser.id}`);
            return newUser;
        }
        const userData = userDoc.data() as User;
        return { ...userData, id: userDoc.id };
    } catch (error) {
        console.error("Failed to fetch authenticated user:", error);
        return null;
    }
}

export async function getUser(userId: string): Promise<User | null> {
    if (!userId) {
        console.error("getUser called with no userId");
        return null;
    }
    try {
        const db = getFirestore();
        const docSnap = await db.collection('users').doc(userId).get();
        return docSnap.exists ? { id: docSnap.id, ...docSnap.data() } as User : null;
    } catch (error) {
        console.error("Error fetching user:", error);
        return null;
    }
}

export async function createUser(user: User) {
    const db = getFirestore();
    await db.collection('users').doc(user.id).set(user);
}

export async function updateUserData(userId: string, data: Partial<Omit<User, 'id' | 'role' | 'email'>>) {
    const db = getFirestore();
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    if (Object.keys(cleanData).length > 0) {
        await db.collection('users').doc(userId).update(cleanData);
    }
}

// --- Data Serialization Helper ---
const convertDocTimestamps = (data: any): any => {
    if (!data) return data;
  
    const convertedData = { ...data };
  
    if (convertedData.createdAt && convertedData.createdAt instanceof Timestamp) {
      convertedData.createdAt = convertedData.createdAt.toDate().toISOString();
    }
  
    if (convertedData.theftReport?.date && convertedData.theftReport.date instanceof Timestamp) {
      convertedData.theftReport.date = convertedData.theftReport.date.toDate().toISOString();
    }
  
    return convertedData;
  };
  

// --- Bike Management ---
export async function getBikes(filter?: { userId?: string; status?: BikeStatus }): Promise<Bike[]> {
    const db = getFirestore();
    let query: FirebaseFirestore.Query = db.collection('bikes');

    // Chain .where() clauses directly, which is the correct way to build the query.
    if (filter?.userId) {
        query = query.where('userId', '==', filter.userId);
    }
    if (filter?.status) {
        query = query.where('status', '==', filter.status);
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => {
        const data = convertDocTimestamps(doc.data());
        return { id: doc.id, ...data } as Bike;
    });
}

export async function getBike(bikeId: string): Promise<Bike | null> {
    if (!bikeId) {
        console.error("getBike called with no bikeId");
        return null;
    }
    try {
        const db = getFirestore();
        const docSnap = await db.collection('bikes').doc(bikeId).get();
        if (!docSnap.exists) return null;
        
        const data = convertDocTimestamps(docSnap.data());
        return { id: docSnap.id, ...data } as Bike;
    } catch (error) {
        console.error("Error fetching bike:", error);
        return null;
    }
}

export async function addBike(bikeData: Omit<Bike, 'id' | 'createdAt' | 'status'>) {
    const db = getFirestore();
    const newBike = {
        ...bikeData,
        serialNumber: normalizeSerialNumber(bikeData.serialNumber),
        status: 'safe' as const,
        createdAt: FieldValue.serverTimestamp(),
    };
    await db.collection('bikes').add(newBike);
}

export async function updateBikeData(bikeId: string, data: Partial<Omit<Bike, 'id'>>) {
    const db = getFirestore();
    const dataToUpdate = { ...data };
    if (data.serialNumber) {
        dataToUpdate.serialNumber = normalizeSerialNumber(data.serialNumber);
    }
    await db.collection('bikes').doc(bikeId).update(dataToUpdate);
}

export async function updateBikeStatus(bikeId: string, status: BikeStatus, theftDetails?: Bike['theftReport']) {
    const db = getFirestore();
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
    const db = getFirestore();
    const snapshot = await db.collection('homepage').get();
    const sections: { [key: string]: HomepageSection } = {};
    snapshot.forEach(doc => {
        sections[doc.id] = doc.data() as HomepageSection;
    });
    return sections;
}

export async function updateHomepageSectionData(data: HomepageSection) {
    const db = getFirestore();
    const { id, ...sectionData } = data;
    await db.collection('homepage').doc(id).set(sectionData, { merge: true });
}
