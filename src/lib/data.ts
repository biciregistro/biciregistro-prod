import 'server-only';
import { getFirestore, FieldValue, Filter, Timestamp } from 'firebase-admin/firestore';
import { firebaseConfig } from './firebase/config';
import type { User, Bike, BikeStatus, HomepageSection } from './types';
import { getDecodedSession } from '@/lib/auth';
import { adminAuth } from './firebase/server';
import { defaultHomepageData } from './homepage-data'; // Import the default data

// --- Helper Functions ---

// Normalizes a serial number for consistent storage and lookup.
const normalizeSerialNumber = (serial: string): string => {
    return serial.replace(/[\s-]+/g, '').toUpperCase();
};

// Checks if a serial number is unique across all bikes, in both old and new data structures.
export async function isSerialNumberUnique(serial: string, excludeBikeId?: string): Promise<boolean> {
    const normalizedSerial = normalizeSerialNumber(serial);
    const db = getFirestore();

    // Query 1: New nested collection structure
    const nestedBikesRef = db.collectionGroup('bikes');
    const nestedQuery = nestedBikesRef.where('serialNumber', '==', normalizedSerial);
    const nestedSnapshot = await nestedQuery.get();
    
    // Query 2: Old root collection structure
    const rootBikesRef = db.collection('bikes');
    const rootQuery = rootBikesRef.where('serialNumber', '==', normalizedSerial);
    const rootSnapshot = await rootQuery.get();

    // Combine results
    const allMatchingDocs = [...nestedSnapshot.docs, ...rootSnapshot.docs];

    // Filter out duplicates by doc.id in case a bike exists in both locations
    const uniqueDocs = allMatchingDocs.filter((doc, index, self) => 
        index === self.findIndex((d) => d.id === doc.id)
    );

    if (uniqueDocs.length === 0) {
        return true; // No bike with this serial number found anywhere.
    }

    // If we need to exclude a bike ID (for updates), check if the only found bike is the one we're excluding.
    if (excludeBikeId) {
        return uniqueDocs.length === 1 && uniqueDocs[0].id === excludeBikeId;
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

        const isAdmin = session.admin === true;

        if (!userDoc.exists) {
            console.warn(`User document not found for UID: ${session.uid}`);
            const firebaseUser = await adminAuth.getUser(session.uid);
            const newUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email!,
                name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
                lastName: '',
                role: isAdmin ? 'admin' : 'ciclista',
            };
            await db.collection('users').doc(newUser.id).set(newUser);
            console.log(`Self-healing: Created user document for UID: ${newUser.id}`);
            return newUser;
        }

        const userData = userDoc.data() as User;

        if (isAdmin) {
            userData.role = 'admin';
        }

        return { ...userData, id: userDoc.id };
    } catch (error) {
        console.error("Failed to fetch authenticated user:", error);
        return null;
    }
}


export async function getUser(userId: string): Promise<User | null> {
    if (!userId) return null;
    try {
        const db = getFirestore();
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
        const db = getFirestore();
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
    if (convertedData.createdAt instanceof Timestamp) {
      convertedData.createdAt = convertedData.createdAt.toDate().toISOString();
    }
    if (convertedData.theftReport?.date instanceof Timestamp) {
      convertedData.theftReport.date = convertedData.theftReport.date.toDate().toISOString();
    }
    return convertedData;
};
  
// --- Bike Management (Corrected for Nested Structure with Backward Compatibility) ---

export async function getBikes(userId: string): Promise<Bike[]> {
    if (!userId) return [];

    const db = getFirestore();
    const bikesMap = new Map<string, Bike>();

    // 1. Fetch from the new nested collection
    const nestedBikesRef = db.collection('users').doc(userId).collection('bikes');
    const nestedSnapshot = await nestedBikesRef.orderBy('createdAt', 'desc').get();
    nestedSnapshot.forEach(doc => {
        const data = convertDocTimestamps(doc.data());
        bikesMap.set(doc.id, { id: doc.id, ...data } as Bike);
    });

    // 2. Fetch from the old root collection (for backward compatibility)
    const rootBikesRef = db.collection('bikes').where('userId', '==', userId);
    const rootSnapshot = await rootBikesRef.get();
    rootSnapshot.forEach(doc => {
        // Avoid overwriting a (potentially updated) bike from the nested collection
        if (!bikesMap.has(doc.id)) {
            const data = convertDocTimestamps(doc.data());
            bikesMap.set(doc.id, { id: doc.id, ...data } as Bike);
        }
    });

    // Convert map to array and sort by creation date
    const allBikes = Array.from(bikesMap.values());
    allBikes.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });

    return allBikes;
}


export async function getBike(userId: string, bikeId: string): Promise<Bike | null> {
    if (!userId || !bikeId) return null;
    try {
        const db = getFirestore();
        // Try fetching from the new nested collection first
        let docSnap = await db.collection('users').doc(userId).collection('bikes').doc(bikeId).get();

        // If not found, try fetching from the old root collection for backward compatibility
        if (!docSnap.exists) {
            docSnap = await db.collection('bikes').doc(bikeId).get();
        }
        
        if (!docSnap.exists) return null;
        
        const data = convertDocTimestamps(docSnap.data());
        // Final check to ensure the user owns this bike, especially for root collection fetches
        if ((data as Bike).userId !== userId) return null;

        return { id: docSnap.id, ...data } as Bike;
    } catch (error) {
        console.error("Error fetching bike:", error);
        return null;
    }
}

export async function getBikeBySerial(serial: string): Promise<Bike | null> {
    const normalizedSerial = normalizeSerialNumber(serial);
    const db = getFirestore();
    
    // First, query the new collection group structure
    const nestedBikesRef = db.collectionGroup('bikes');
    const nestedQuery = nestedBikesRef.where('serialNumber', '==', normalizedSerial);
    let snapshot = await nestedQuery.get();

    // If not found, query the old root collection
    if (snapshot.empty) {
        const rootBikesRef = db.collection('bikes');
        const rootQuery = rootBikesRef.where('serialNumber', '==', normalizedSerial);
        snapshot = await rootQuery.get();
    }

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = convertDocTimestamps(doc.data());
    return { id: doc.id, ...data } as Bike;
}

// Writes ONLY to the new nested collection structure
export async function addBike(userId: string, bikeData: Omit<Bike, 'id' | 'createdAt' | 'status' | 'userId'>) {
    const db = getFirestore();
    const newBike = {
        ...bikeData,
        userId: userId, // Ensure userId is set
        serialNumber: normalizeSerialNumber(bikeData.serialNumber),
        status: 'safe' as const,
        createdAt: FieldValue.serverTimestamp(),
    };
    await db.collection('users').doc(userId).collection('bikes').add(newBike);
}

// Updates data in the correct location (new or old structure)
export async function updateBikeData(userId: string, bikeId: string, data: Partial<Omit<Bike, 'id'>>) {
    const db = getFirestore();
    const dataToUpdate: { [key: string]: any } = { ...data };

    if (data.serialNumber) {
        dataToUpdate.serialNumber = normalizeSerialNumber(data.serialNumber);
    }
    
    for (const key in dataToUpdate) {
        if (dataToUpdate[key] === undefined) {
            dataToUpdate[key] = FieldValue.delete();
        }
    }

    // Check if the bike exists in the new nested structure
    const nestedBikeRef = db.collection('users').doc(userId).collection('bikes').doc(bikeId);
    const nestedDoc = await nestedBikeRef.get();

    if (nestedDoc.exists) {
        await nestedBikeRef.update(dataToUpdate);
    } else {
        // If not in the new structure, assume it's in the old one and update it there
        const rootBikeRef = db.collection('bikes').doc(bikeId);
        await rootBikeRef.update(dataToUpdate);
    }
}

// --- Homepage Content Management ---
export async function getHomepageData(): Promise<{ [key: string]: HomepageSection }> {
    const db = getFirestore();
    const snapshot = await db.collection('homepage').get();
    
    const firestoreData: { [key: string]: HomepageSection } = {};
    snapshot.forEach(doc => {
        firestoreData[doc.id] = { id: doc.id, ...doc.data() } as HomepageSection;
    });

    const mergedData = {
        ...defaultHomepageData,
        ...firestoreData,
    };
    
    return mergedData;
}


export async function updateHomepageSectionData(data: HomepageSection) {
    const db = getFirestore();
    const { id, ...sectionData } = data;
    await db.collection('homepage').doc(id).set(sectionData, { merge: true });
}
