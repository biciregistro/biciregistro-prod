import type { Bike, User, HomepageSection } from './types';
import { PlaceHolderImages } from './placeholder-images';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuthenticatedUser as getFirebaseUser } from './auth';

const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

let bikes: Bike[] = [
  {
    id: 'bike-1',
    userId: 'user-1',
    serialNumber: 'SN-ABC-123',
    make: 'Momentum',
    model: 'iNeed Street',
    color: 'Blue',
    modelYear: '2023',
    modality: 'Urbana',
    status: 'safe',
    photos: [getImage('bike-1'), getImage('bike-2')],
    ownershipDocs: ['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'],
  },
  {
    id: 'bike-2',
    userId: 'user-1',
    serialNumber: 'SN-DEF-456',
    make: 'Trek',
    model: 'Marlin 5',
    color: 'Red',
    modelYear: '2022',
    modality: 'XC',
    status: 'stolen',
    photos: [getImage('bike-2')],
    ownershipDocs: [],
    theftReport: {
      date: new Date().toISOString(),
      location: 'Parque Central',
      details: 'Robada del portabicicletas entre las 2 PM y las 4 PM.',
      country: 'México',
      state: 'Ciudad de México'
    },
  },
  {
    id: 'bike-3',
    userId: 'user-2',
    serialNumber: 'SN-GHI-789',
    make: 'Specialized',
    model: 'Sirrus X',
    color: 'Black',
    modelYear: '2024',
    modality: 'Gravel',
    status: 'safe',
    photos: [getImage('bike-3')],
    ownershipDocs: [],
  },
];

let homepageContent: HomepageSection[] = [
  {
    id: 'hero',
    title: 'Tu bici, Protegida',
    subtitle: 'La plataforma definitiva para el registro de bicicletas y la recuperación en caso de robo.',
    content: 'Únete a miles de ciclistas que confían en Biciregistro para proteger su preciada posesión. Regístrate en minutos, reporta robos al instante y aumenta tus posibilidades de recuperación.',
    imageUrl: getImage('hero-background'),
  },
  {
    id: 'features',
    title: '¿Por qué registrarte?',
    subtitle: 'Simples razones para tu tranquilidad',
    content: ''
  },
  {
    id: 'cta',
    title: '¿Listo para Proteger tu Bici?',
    subtitle: 'Únete a Biciregistro hoy y pedalea con confianza.',
    content: '',
    imageUrl: getImage('cta-background'),
  }
];


// Mock API
export const getAuthenticatedUser = async (): Promise<User | null> => {
  const firebaseUser = await getFirebaseUser();
  if (!firebaseUser) {
    return null;
  }
  // The decoded token has the user ID, so we fetch the full profile from Firestore
  return getUserById(firebaseUser.uid);
};

export async function createUser(user: Omit<User, 'id'> & { id: string }) {
    const db = getFirestore();
    // Use the UID from Firebase Auth as the document ID
    await db.collection('users').doc(user.id).set(user);
    return user;
}


export async function getUserById(userId: string): Promise<User | null> {
    if (!userId) {
        return null;
    }
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        // This case might happen if a user is created in Auth but not in Firestore.
        // You might want to handle this by creating a user profile here.
        console.warn(`User with ID ${userId} found in Auth, but not in Firestore.`);
        return null;
    }
    return userDoc.data() as User;
}

export const updateUserData = async (userId: string, userData: Partial<Omit<User, 'id' | 'email' | 'role'>>) => {
    const db = getFirestore();
    // Make sure to only update the fields, not overwrite the document
    await db.collection('users').doc(userId).update(userData);

    // Re-fetch the updated user data to return it
    const userDoc = await db.collection('users').doc(userId).get();
    return userDoc.data() as User;
}


export const getUserBikes = async (userId: string): Promise<Bike[]> => {
  return bikes.filter(bike => bike.userId === userId);
};

export const getBikeById = async (bikeId: string): Promise<Bike | undefined> => {
  return bikes.find(bike => bike.id === bikeId);
};

export const getBikeBySerial = async (serial: string): Promise<Bike | undefined> => {
    return bikes.find(bike => bike.serialNumber.toLowerCase() === serial.toLowerCase());
}

export const getHomepageContent = async (): Promise<HomepageSection[]> => {
  return homepageContent;
};

export const updateHomepageSectionData = (section: HomepageSection) => {
    const index = homepageContent.findIndex(s => s.id === section.id);
    if(index !== -1) {
        homepageContent[index] = { ...homepageContent[index], ...section };
    }
    return homepageContent[index];
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
