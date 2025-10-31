export type BikeStatus = 'safe' | 'stolen' | 'in_transfer';

export type Bike = {
  id: string;
  userId: string;
  serialNumber: string;
  make: string;
  model: string;
  color: string;
  status: BikeStatus;
  photos: string[]; // URLs to images
  ownershipDocs: string[]; // URLs to documents
  theftReport?: {
    date: string;
    location: string;
    details: string;
    country?: string;
    state?: string;
  };
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'ciclista' | 'admin';
  avatarUrl?: string;
};

export type HomepageSection = {
  id: 'hero' | 'features' | 'cta';
  title: string;
  subtitle: string;
  content: string;
  imageUrl?: string;
};
