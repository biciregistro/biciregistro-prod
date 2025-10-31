export type BikeStatus = 'safe' | 'stolen' | 'in_transfer';

export type Bike = {
  id: string;
  userId: string;
  serialNumber: string;
  make: string;
  model: string;
  color: string;
  modelYear?: string;
  modality?: string;
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
  lastName?: string;
  email: string;
  role: 'ciclista' | 'admin';
  avatarUrl?: string;
  country?: string;
  state?: string;
  birthDate?: string;
  gender?: 'masculino' | 'femenino' | 'otro';
  postalCode?: string;
  whatsapp?: string;
};

export type HomepageSection = {
  id: 'hero' | 'features' | 'cta';
  title: string;
  subtitle: string;
  content: string;
  imageUrl?: string;
};
