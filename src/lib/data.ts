import type { Bike, User, HomepageSection } from './types';
import { PlaceHolderImages } from './placeholder-images';
import { getFirestore } from 'firebase-admin/firestore';
import { getDecodedSession } from './auth';
import { adminApp } from './firebase/server';

const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

const fallbackHomepageData: HomepageSection[] = [
    {
        id: 'hero',
        title: 'Biciregistro: Tu Bici, Segura y Registrada',
        subtitle: 'La plataforma definitiva para proteger tu inversión y unirte a la comunidad ciclista.',
        content: 'Registra el número de serie, denuncia robos y verifica bicicletas de segunda mano, todo en un solo lugar.',
        imageUrl: getImage('hero-background'),
    },
    {
        id: 'features',
        title: 'Potencia y Sencillez',
        subtitle: 'Diseñado por ciclistas, para ciclistas.',
        content: '',
    },
    {
        id: 'cta',
        title: '¿Listo para rodar con seguridad?',
        subtitle: 'Crea tu cuenta gratuita hoy mismo y mantén un registro seguro de todas tus bicicletas.',
        content: '',
        imageUrl: getImage('cta-background'),
    }
];


// Mock data for bikes - can be replaced with Firestore logic later
let bikes: Bike[] = [
    // ... mock bike data
];

// --- User and Auth Functions ---

/**
 * Gets the full authenticated user profile.
 * It first checks for a valid session and then fetches the user data from Firestore.
 * @returns {Promise<User | null>} The full user object or null if not authenticated.
 */
export const getAuthenticatedUser = async (): Promise<User | null> => {
    const decodedSession = await getDecodedSession();
    if (!decodedSession) {
        return null;
    }

    try {
        return await getUserById(decodedSession.uid);
    } catch (error) {
        // This handles cases where the user exists in Auth but not in Firestore.
        console.error("Error fetching user from Firestore:", error);
        return null;
    }
};


export async function createUser(user: Omit<User, 'id'> & { id: string }) {
    const db = getFirestore(adminApp);
    await db.collection('users').doc(user.id).set(user);
    return user;
}

export async function getUserById(userId: string): Promise<User | null> {
    if (!userId) return null;
    const db = getFirestore(adminApp);
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        // This is a critical error state: user is authenticated but has no DB record.
        // Throwing an error here allows the calling layout to handle it, e.g., by logging out.
        throw new Error(`User with ID ${userId} found in Auth, but not in Firestore.`);
    }
    return userDoc.data() as User;
}

export const updateUserData = async (userId: string, userData: Partial<Omit<User, 'id' | 'email' | 'role'>>) => {
    const db = getFirestore(adminApp);
    await db.collection('users').doc(userId).update(userData);
    const userDoc = await db.collection('users').doc(userId).get();
    return userDoc.data() as User;
}

// --- Homepage Content Functions (Now using Firestore) ---

/**
 * Fetches all sections for the homepage from the 'homepage' collection in Firestore.
 * If the collection is empty or an error occurs, it returns fallback data.
 * @returns {Promise<HomepageSection[]>} A list of homepage sections.
 */
export const getHomepageContent = async (): Promise<HomepageSection[]> => {
    try {
        const db = getFirestore(adminApp);
        const homepageSnapshot = await db.collection('homepage').get();

        if (homepageSnapshot.empty) {
            console.warn("Homepage collection is empty. Returning fallback data.");
            return fallbackHomepageData;
        }

        const sections = homepageSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as HomepageSection[];

        return sections;
    } catch (error) {
        console.error("Failed to fetch homepage content from Firestore. Returning fallback data.", error);
        return fallbackHomepageData;
    }
};

/**
 * Updates a specific section of the homepage in Firestore.
 * @param section The homepage section data to update.
 */
export const updateHomepageSectionData = async (section: HomepageSection) => {
    const { id, ...sectionData } = section;
    const db = getFirestore(adminApp);
    await db.collection('homepage').doc(id).set(sectionData, { merge: true });
    
    // Return the updated section data
    const updatedDoc = await db.collection('homepage').doc(id).get();
    return { id, ...updatedDoc.data() } as HomepageSection;
}


// --- Mock Bike Functions ---

export const getUserBikes = async (userId: string): Promise<Bike[]> => {
  return bikes.filter(bike => bike.userId === userId);
};

export const getBikeById = async (bikeId: string): Promise<Bike | undefined> => {
  return bikes.find(bike => bike.id === bikeId);
};

export const getBikeBySerial = async (serial: string): Promise<Bike | undefined> => {
    return bikes.find(bike => bike.serialNumber.toLowerCase() === serial.toLowerCase());
}

export const addBike = (bike: Omit<Bike, 'id' | 'status'>) => {
    const newBike: Bike = {
        id: `bike-${Date.now()}`,
        status: 'safe',
        ...bike
    };
    bikes.push(newBike);
    return newBike;
}

export const updateBikeData = (bikeId: string, bikeData: Partial<Omit<Bike, 'id' | 'userId' | 'photos' | 'ownershipDocs' | 'status'>>) => {
    const index = bikes.findIndex(b => b.id === bikeId);
    if (index !== -1) {
        bikes[index] = { ...bikes[index], ...bikeData };
    }
    return bikes[index];
}

export const updateBikeStatus = (bikeId: string, status: 'stolen' | 'safe', theftDetails?: Omit<Bike['theftReport'], 'date'> & { date: string }) => {
    const bike = bikes.find(b => b.id === bikeId);
    if (bike) {
        bike.status = status;
        if(status === 'stolen' && theftDetails) {
            bike.theftReport = { ...theftDetails, date: new Date(theftDetails.date).toISOString() }
        } else if (status === 'safe') {
            bike.theftReport = undefined;
        }
    }
    return bike;
}
