import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { User, Bike, BikeStatus, HomepageSection } from './types';
import { getDecodedSession } from '@/lib/auth';
import { adminDb, adminAuth } from './firebase/server';
import { defaultHomepageData } from './homepage-data';
import { firebaseConfig } from './firebase/config';

// --- Helper Functions ---

const normalizeSerialNumber = (serial: string): string => {
    return serial.replace(/[\s-]+/g, '').toUpperCase();
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

export async function verifyUserPassword(email: string, password_provided: string): Promise<boolean> {
    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`;
    try {
        const response = await fetch(signInUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: password_provided, returnSecureToken: false }),
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
        const db = adminDb;
        const userDoc = await db.collection('users').doc(session.uid).get();
        if (!userDoc.exists) {
            const firebaseUser = await adminAuth.getUser(session.uid);
            const newUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email!,
                name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
                lastName: '',
                role: 'ciclista',
            };
            await db.collection('users').doc(newUser.id).set(newUser);
            return newUser;
        }
        return { id: userDoc.id, ...userDoc.data() } as User;
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

export async function updateUserData(userId: string, data: Partial<Omit<User, 'id' | 'role' | 'email'>>) {
    const db = adminDb;
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

// --- Bike Management ---
export async function getBikes(userId: string): Promise<Bike[]> {
    if (!userId) return [];
    const db = adminDb;
    let query = db.collection('bikes').where('userId', '==', userId);
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...convertDocTimestamps(doc.data()) } as Bike));
}

export async function getBike(bikeId: string): Promise<Bike | null> {
    if (!bikeId) return null;
    try {
        const db = adminDb;
        const docSnap = await db.collection('bikes').doc(bikeId).get();
        if (!docSnap.exists) return null;
        return { id: docSnap.id, ...convertDocTimestamps(docSnap.data()) } as Bike;
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
