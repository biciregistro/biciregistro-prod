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

// Checks if a serial number is unique across all bikes.
export async function isSerialNumberUnique(serial: string, excludeBikeId?: string): Promise<boolean> {
    const normalizedSerial = normalizeSerialNumber(serial);
    const db = getFirestore();
    const bikesRef = db.collectionGroup('bikes'); // Query across all users' bikes subcollections
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
  
// --- Bike Management (Corrected for Nested Structure) ---

export async function getBikes(userId: string): Promise<Bike[]> {
    const db = getFirestore();
    const bikesRef = db.collection('users').doc(userId).collection('bikes');
    const snapshot = await bikesRef.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => {
        const data = convertDocTimestamps(doc.data());
        return { id: doc.id, ...data } as Bike;
    });
}

export async function getBike(userId: string, bikeId: string): Promise<Bike | null> {
    if (!userId || !bikeId) return null;
    try {
        const db = getFirestore();
        const docSnap = await db.collection('users').doc(userId).collection('bikes').doc(bikeId).get();
        if (!docSnap.exists) return null;
        
        const data = convertDocTimestamps(docSnap.data());
        return { id: docSnap.id, ...data } as Bike;
    } catch (error) {
        console.error("Error fetching bike:", error);
        return null;
    }
}

export async function getBikeBySerial(serial: string): Promise<Bike | null> {
    const normalizedSerial = normalizeSerialNumber(serial);
    const db = getFirestore();
    const bikesRef = db.collectionGroup('bikes'); // Query across all subcollections
    const query = bikesRef.where('serialNumber', '==', normalizedSerial);
    
    const snapshot = await query.get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = convertDocTimestamps(doc.data());
    return { id: doc.id, ...data } as Bike;
}

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

    await db.collection('users').doc(userId).collection('bikes').doc(bikeId).update(dataToUpdate);
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
