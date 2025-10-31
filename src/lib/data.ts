import type { Bike, User, HomepageSection } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

let users: User[] = [
  { 
    id: 'user-1', 
    name: 'Alex', 
    lastName: 'Ryder', 
    email: 'alex@example.com', 
    role: 'ciclista', 
    avatarUrl: 'https://picsum.photos/seed/avatar1/100/100', 
    country: 'México', 
    state: 'Jalisco', 
    birthDate: '1990-05-15',
    gender: 'masculino',
    postalCode: '44100',
    whatsapp: '523312345678'
  },
  { id: 'user-2', name: 'Maria', lastName: 'Garcia', email: 'maria@example.com', role: 'ciclista', avatarUrl: 'https://picsum.photos/seed/avatar2/100/100' },
  { id: 'admin-1', name: 'Admin', lastName: 'Vera', email: 'admin@biciregistro.com', role: 'admin', avatarUrl: 'https://picsum.photos/seed/avatar3/100/100' },
];

let bikes: Bike[] = [
  {
    id: 'bike-1',
    userId: 'user-1',
    serialNumber: 'SN-ABC-123',
    make: 'Momentum',
    model: 'iNeed Street',
    color: 'Blue',
    status: 'safe',
    photos: [getImage('bike-1'), getImage('bike-2')],
    ownershipDocs: [],
  },
  {
    id: 'bike-2',
    userId: 'user-1',
    serialNumber: 'SN-DEF-456',
    make: 'Trek',
    model: 'Marlin 5',
    color: 'Red',
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
    title: 'Cómo Funciona',
    subtitle: 'Pasos sencillos para tu tranquilidad.',
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
  // In a real app, this would involve session/token validation
  // For now, we'll return a mock user. Change 'admin-1' to 'user-1' or null to test different states.
  return users.find(u => u.id === 'user-1') || null;
};

export const findUserByEmail = async (email: string): Promise<User | undefined> => {
    return users.find(u => u.email === email);
}

export const updateUserData = (userId: string, userData: Partial<Omit<User, 'id' | 'email' | 'role'>>) => {
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
        users[index] = { ...users[index], ...userData };
    }
    return users[index];
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
