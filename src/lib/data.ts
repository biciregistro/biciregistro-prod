import 'server-only';
import { getFirestore, FieldValue, Filter } from 'firebase-admin/firestore';
import { firebaseConfig } from './firebase/config';
import type { User, Bike, BikeStatus, HomepageSection } from './types';
import { getDecodedSession } from '@/lib/auth';


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

        // If the sign-in is successful (status 200), the password is correct.
        return response.ok;

    } catch (error) {
        console.error("Error verifying password:", error);
        return false; // On any error, assume the password is not valid.
    }
}


// --- User Management ---

export async function getAuthenticatedUser(): Promise<User | null> {
    const session = await getDecodedSession();

    if (!session?.uid) {
        return null;
    }

    try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(session.uid).get();
        if (!userDoc.exists) {
            console.warn(`User document not found for UID: ${session.uid}`);
            return null;
        }

        const userData = userDoc.data() as User;
        return {
            ...userData,
            id: userDoc.id,
        };
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
        
        if (docSnap.exists) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            } as User;
        } else {
            return null;
        }
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
    // Ensure that only non-undefined values are sent to Firestore
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    if (Object.keys(cleanData).length > 0) {
        await db.collection('users').doc(userId).update(cleanData);
    }
}

// --- Bike Management ---
export async function getBikes(filter?: { userId?: string; status?: BikeStatus }): Promise<Bike[]> {
    const db = getFirestore();
    const bikesCollection = db.collection('bikes');
    let query;

    if (filter?.userId && filter?.status) {
        query = bikesCollection.where(
            Filter.and(
                Filter.where('userId', '==', filter.userId),
                Filter.where('status', '==', filter.status)
            )
        );
    } else if (filter?.userId) {
        query = bikesCollection.where('userId', '==', filter.userId);
    } else if (filter?.status) {
        query = bikesCollection.where('status', '==', filter.status);
    } else {
        query = bikesCollection;
    }

    // The .orderBy('createdAt', 'desc') was removed to prevent the missing index error.
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Bike[];
}

export async function getBike(bikeId: string): Promise<Bike | null> {
    if (!bikeId) {
        console.error("getBike called with no bikeId");
        return null;
    }
    
    try {
        const db = getFirestore();
        const docSnap = await db.collection('bikes').doc(bikeId).get();
        
        if (docSnap.exists) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            } as Bike;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching bike:", error);
        return null;
    }
}

export async function addBike(bikeData: Omit<Bike, 'id' | 'createdAt' | 'status'>) {
    const db = getFirestore();
    const newBike = {
        ...bikeData,
        status: 'safe' as const,
        createdAt: FieldValue.serverTimestamp(),
    };
    await db.collection('bikes').add(newBike);
}

export async function updateBikeData(bikeId: string, data: Partial<Omit<Bike, 'id'>>) {
    const db = getFirestore();
    await db.collection('bikes').doc(bikeId).update(data);
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
