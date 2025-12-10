export type BikeStatus = 'safe' | 'stolen' | 'in_transfer' | 'recovered';

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
    city?: string; // Added field
    zipCode?: string; // Added field (optional)
    lat?: number; // Added field
    lng?: number; // Added field
  };
};

export type UserRole = 'ciclista' | 'admin' | 'ong';

export type NotificationPreferences = {
    safety: boolean;
    marketing: boolean;
};

export type User = {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  country?: string;
  state?: string;
  city?: string; // Added field
  birthDate?: string;
  gender?: 'masculino' | 'femenino' | 'otro';
  postalCode?: string;
  whatsapp?: string;
  communityId?: string; // ID of the ONG the user is affiliated with
  notificationPreferences?: NotificationPreferences;
  createdAt?: string; // Added for analytics
  // Emergency Info (HU-EVENT-005)
  bloodType?: string;
  insuranceInfo?: string;
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
  // Financial Data for Payouts
  financialData?: {
    bankName: string;
    accountHolder: string;
    clabe: string; // 18 digits
  };
};

// --- Event Types ---

export type EventStatus = 'draft' | 'published';
export type EventType = 'Rodada' | 'Competencia' | 'Taller' | 'Conferencia';
export type EventLevel = 'Principiante' | 'Intermedio' | 'Avanzado';

export type CostTier = {
  id: string; // for React key prop
  name: string;
  price: number; // PRECIO TOTAL (Gross-up)
  netPrice?: number; // PRECIO NETO (Lo que el organizador ingresó)
  fee?: number; // Monto de la comisión total
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

  // Registration Deadline Fields
  hasRegistrationDeadline?: boolean;
  registrationDeadline?: string; // ISO string for date and time

  // Emergency Contact Configuration
  requiresEmergencyContact?: boolean;

  // Bike Requirement
  requiresBike?: boolean; // Defaults to true if undefined

  // Sponsors
  sponsors?: string[]; // Array of image URLs

  // Administrative Control
  isBlocked?: boolean; // Bloqueo manual por administrador
};

export type PaymentStatus = 'pending' | 'paid' | 'not_applicable';

export type EventRegistration = {
    id: string;
    eventId: string;
    userId: string;
    registrationDate: string; // ISO String
    status: 'confirmed' | 'cancelled';
    
    // Financial & Attendance Status
    paymentStatus?: PaymentStatus;
    // Hybrid Payment Support
    paymentMethod?: 'platform' | 'manual'; 
    feeAmount?: number; 
    netPrice?: number;

    checkedIn?: boolean;
    checkedInAt?: string; // ISO String

    tierId?: string;
    tierName?: string;
    price?: number;
    categoryId?: string;
    categoryName?: string;
    bikeId?: string;
    
    // Emergency Contact Data
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    // Extended Emergency Info (HU-EVENT-005)
    bloodType?: string | null;
    insuranceInfo?: string | null;
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
    price?: number; // Added for revenue calculation
    status: 'confirmed' | 'cancelled';
    
    // Financial & Attendance Status
    paymentStatus: PaymentStatus;
    paymentMethod?: 'platform' | 'manual';
    feeAmount?: number;

    checkedIn: boolean;
    
    bike?: {
        id: string;
        make: string;
        model: string;
        serialNumber: string;
    };
    // Emergency Contact Data
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    // Extended Emergency Info (HU-EVENT-005)
    bloodType?: string | null;
    insuranceInfo?: string | null;
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
    }
  | {
      id: 'allies';
      title: string;
      sponsors: { name?: string; url: string }[];
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

// Financial Configuration Type
export type FinancialSettings = {
    commissionRate: number; // Porcentaje de comisión de BiciRegistro (Ej. 3.5)
    pasarelaRate: number; // Porcentaje de comisión de la pasarela (Ej. 3.5)
    pasarelaFixed: number; // Monto fijo de la pasarela (Ej. 4.50)
    ivaRate: number; // Tasa de IVA (Ej. 16.0)
};

// --- Dashboard Filters ---
export type DashboardFilters = {
    country?: string;
    state?: string;
    brand?: string;
    modality?: string;
    gender?: string;
};

// --- Payout Management ---
export type Payout = {
    id: string;
    eventId: string;
    ongId: string;
    amount: number;
    date: string; // ISO String
    proofUrl: string;
    proofPath: string; // For storage management
    notes?: string;
    createdBy: string; // Admin UID
};
