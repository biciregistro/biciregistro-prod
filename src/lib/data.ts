import type { Bike, User, HomepageSection } from './types';
import { PlaceHolderImages } from './placeholder-images';
import { getFirestore } from 'firebase-admin/firestore';
// Correctly import the primary authentication function
import { getAuthenticatedUser as getFirebaseUser } from './auth';

const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

// Mock data for bikes - can be replaced with Firestore logic later
let bikes: Bike[] = [
    // ... mock bike data
];

// --- User and Auth Functions ---

export const getAuthenticatedUser = async (): Promise<User | null> => {
  return getFirebaseUser();
};

export async function createUser(user: Omit<User, 'id'> & { id: string }) {
    const db = getFirestore();
    await db.collection('users').doc(user.id).set(user);
    return user;
}

export async function getUserById(userId: string): Promise<User | null> {
    if (!userId) return null;
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        console.warn(`User with ID ${userId} found in Auth, but not in Firestore.`);
        return null;
    }
    return userDoc.data() as User;
}

export const updateUserData = async (userId: string, userData: Partial<Omit<User, 'id' | 'email' | 'role'>>) => {
    const db = getFirestore();
    await db.collection('users').doc(userId).update(userData);
    const userDoc = await db.collection('users').doc(userId).get();
    return userDoc.data() as User;
}

// --- Homepage Content Functions (Now using Firestore) ---

/**
 * Fetches all sections for the homepage from the 'homepage' collection in Firestore.
 * @returns {Promise<HomepageSection[]>} A list of homepage sections.
 */
export const getHomepageContent = async (): Promise<HomepageSection[]> => {
  try {
    const db = getFirestore();
    const homepageSnapshot = await db.collection('homepage').get();
    if (homepageSnapshot.empty) {
        console.warn("Homepage collection is empty in Firestore. Serving fallback mock data.");
        // Optional: return mock data as a fallback if the collection is empty
        return [];
    }
    const sections: HomepageSection[] = homepageSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as HomepageSection));
    return sections;
  } catch (error) {
      console.error("Error fetching homepage content from Firestore:", error);
      // Fallback to empty array or mock data in case of error
      return [];
  }
};

/**
 * Updates a specific section of the homepage in Firestore.
 * @param section The homepage section data to update.
 */
export const updateHomepageSectionData = async (section: HomepageSection) => {
    const { id, ...sectionData } = section;
    const db = getFirestore();
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
