import type { Bike, User, HomepageSection } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

const users: User[] = [
  { id: 'user-1', name: 'Alex Ryder', email: 'alex@example.com', role: 'ciclista', avatarUrl: 'https://picsum.photos/seed/avatar1/100/100' },
  { id: 'user-2', name: 'Maria Garcia', email: 'maria@example.com', role: 'ciclista', avatarUrl: 'https://picsum.photos/seed/avatar2/100/100' },
  { id: 'admin-1', name: 'Admin Vera', email: 'admin@bicisecure.com', role: 'admin', avatarUrl: 'https://picsum.photos/seed/avatar3/100/100' },
];

const bikes: Bike[] = [
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
      location: 'Downtown Park',
      details: 'Stolen from bike rack between 2 PM and 4 PM.',
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
    title: 'Your Bike, Secured.',
    subtitle: 'The ultimate platform for bicycle registration and theft recovery.',
    content: 'Join thousands of cyclists who trust BiciSecure to protect their prized possession. Register in minutes, report thefts instantly, and increase your chances of recovery.',
    imageUrl: getImage('hero-background'),
  },
  {
    id: 'features',
    title: 'How It Works',
    subtitle: 'Simple steps to peace of mind.',
    content: ''
  },
  {
    id: 'cta',
    title: 'Ready to Protect Your Ride?',
    subtitle: 'Join BiciSecure today and ride with confidence.',
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

export const updateBikeStatus = (bikeId: string, status: 'stolen' | 'safe') => {
    const bike = bikes.find(b => b.id === bikeId);
    if (bike) {
        bike.status = status;
        if(status === 'stolen' && !bike.theftReport) {
            bike.theftReport = { date: new Date().toISOString(), location: 'Unknown', details: 'Reported stolen by owner.'}
        } else if (status === 'safe') {
            bike.theftReport = undefined;
        }
    }
    return bike;
}
