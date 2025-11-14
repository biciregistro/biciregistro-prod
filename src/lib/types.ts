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
  ownershipProof?: string; // URL to a single ownership document/proof
  appraisedValue?: number; // Approximate value of the bike
  theftReport?: {
    date: string;
    time?: string;
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

// --- Homepage Content Types (Corrected) ---

export type Feature = {
  title: string;
  description: string;
  imageUrl?: string;
};

// Use a discriminated union for more type-safe sections
export type HomepageSection =
  | {
      id: 'hero';
      title: string;
      subtitle: string;
      buttonText?: string;
      imageUrl?: string;
    }
  | {
      id: 'features';
      title: string;
      subtitle: string;
      features: Feature[];
    }
  | {
      id: 'cta';
      title: string;
      subtitle: string;
      buttonText?: string;
      imageUrl?: string;
    };


// Type for server action form state
export type ActionFormState = {
  error?: string;
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
  customToken?: string;
} | null;

// Standardized type for bike registration/update form state
export type BikeFormState = {
    success: boolean;
    message: string;
    errors?: Record<string, string[]>;
} | null;
