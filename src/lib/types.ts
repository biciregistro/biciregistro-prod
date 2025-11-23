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
  createdAt?: string; // ISO string format of the creation date
  theftReport?: {
    date: string;
    time?: string;
    location: string;
    details: string;
    country?: string;
    state?: string;
  };
};

export type UserRole = 'ciclista' | 'admin' | 'ong';

export type User = {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  country?: string;
  state?: string;
  birthDate?: string;
  gender?: 'masculino' | 'femenino' | 'otro';
  postalCode?: string;
  whatsapp?: string;
  communityId?: string; // ID of the ONG the user is affiliated with
};

export type OngUser = {
  id: string; // Custom UID based on organization name
  role: 'ong';
  email: string;
  organizationName: string;
  contactPerson: string;
  organizationWhatsapp: string;
  contactWhatsapp: string;
  websiteUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  country: string;
  state: string;
  avatarUrl?: string;
  invitationLink: string; // The unique invitation link for the ONG
};

// --- Event Types ---

export type EventStatus = 'draft' | 'published';
export type EventType = 'Rodada' | 'Competencia' | 'Taller' | 'Conferencia';
export type EventLevel = 'Principiante' | 'Intermedio' | 'Avanzado';

export type CostTier = {
  id: string; // for React key prop
  name: string;
  price: number;
  includes: string;
};

export type EventCategory = {
    id: string; // for React key prop
    name: string;
    description?: string;
};

export type Event = {
  id: string;
  ongId: string;
  status: EventStatus;
  
  // Required fields
  name: string;
  eventType: EventType;
  date: string; // ISO string for date and time
  country: string;
  state: string; // 'state' is used in the codebase for state/province
  modality: string;
  description: string;

  // Optional fields
  imageUrl?: string;
  googleMapsUrl?: string;
  level?: EventLevel;
  distance?: number;
  costType?: 'Gratuito' | 'Con Costo';
  costTiers?: CostTier[];
  paymentDetails?: string;
  organizerName?: string;
  organizerFollowers?: number;
  
  // New fields for categories and limits
  hasCategories?: boolean;
  categories?: EventCategory[];
  maxParticipants?: number;
  currentParticipants?: number;
};

export type EventRegistration = {
    id: string;
    eventId: string;
    userId: string;
    registrationDate: string; // ISO String
    status: 'confirmed' | 'cancelled';
    tierId?: string;
    tierName?: string;
    price?: number;
    categoryId?: string;
    categoryName?: string;
    bikeId?: string;
};

export type EventAttendee = {
    id: string; // Registration ID
    userId: string;
    name: string;
    lastName: string;
    email: string;
    whatsapp?: string;
    registrationDate: string;
    tierName: string;
    categoryName: string;
    status: 'confirmed' | 'cancelled';
    bike?: {
        id: string;
        make: string;
        model: string;
        serialNumber: string;
    };
};

export type UserEventRegistration = EventRegistration & {
    event: Event;
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
  passwordChanged?: boolean;
} | null;

// Standardized type for bike registration/update form state
export type BikeFormState = {
    success: boolean;
    message: string;
    errors?: Record<string, string[]>;
} | null;
