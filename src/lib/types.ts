
import { GamificationProfile } from './gamification/gamification-types';

export type BikeStatus = 'safe' | 'stolen' | 'in_transfer' | 'recovered';

export type BikonDeviceStatus = 'available' | 'assigned' | 'inactive';

export type BikonDevice = {
  id: string; // Serial number is the ID
  serialNumber: string;
  status: BikonDeviceStatus;
  createdAt: string; // ISO string
  assignedToBikeId?: string;
  assignedToUserId?: string;
  assignedAt?: string; // ISO string
  batchId?: string;
  isPrinted?: boolean; // Nuevo campo para control de inventario físico
};

// Tipo enriquecido para la UI de administración
export type BikonDevicePopulated = BikonDevice & {
  assignedUser?: {
    name: string;
    lastName?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  assignedBike?: {
    make: string;
    model: string;
    color: string;
    serialNumber: string;
  };
};

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
  registrationIp?: string; // IP address from where the bike was registered
  // Seguimiento de difusión administrativa
  adminSharedAt?: string; // ISO string de cuándo el admin compartió el robo
  bikonId?: string | null; // ID of the linked Bikon device
  theftReport?: {
    date: string;
    time?: string;
    location: string;
    details: string;
    country?: string;
    state?: string;
    city?: string;
    zipCode?: string;
    lat?: number;
    lng?: number;
    reward?: string;
    thiefDetails?: string;
    contactProfile?: string; // Nuevo campo para perfil social
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
  phone?: string; 
  role: UserRole;
  avatarUrl?: string;
  logoUrl?: string; 
  country?: string;
  state?: string;
  city?: string; 
  birthDate?: string;
  gender?: 'masculino' | 'femenino' | 'otro';
  postalCode?: string;
  whatsapp?: string;
  communityId?: string; 
  notificationPreferences?: NotificationPreferences;
  createdAt?: string;
  bloodType?: string;
  insuranceInfo?: string;
  allergies?: string; 
  fcmTokens?: string[];
  referralCode?: string; 
  referredBy?: string;   
  gamification?: GamificationProfile;
  // Campos legales
  termsAcceptedAt?: string; // ISO string timestamp de aceptación
  termsVersion?: string; // Versión de los términos aceptados (ej. '2026-01-31')
};

export type OngUser = {
  id: string; 
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
  logoUrl?: string; 
  coverUrl?: string;
  description?: string; 
  invitationLink: string; 
  financialData?: {
    bankName: string;
    accountHolder: string;
    clabe: string; 
  };
};

export type EventStatus = 'draft' | 'published';
export type EventType = 'Rodada' | 'Competencia' | 'Taller' | 'Conferencia';
export type EventLevel = 'Principiante' | 'Intermedio' | 'Avanzado';

export type CostTier = {
  id: string; 
  name: string;
  price: number; 
  netPrice?: number; 
  fee?: number; 
  includes: string;
  absorbFee?: boolean;
  limit?: number; // Optional limit of tickets
  soldCount?: number; // Current number of tickets sold
};

export type EventCategory = {
    id: string; 
    name: string;
    description?: string;
    ageConfig?: {
        isRestricted: boolean;
        minAge?: number;
        maxAge?: number;
    };
    startTime?: string;
};

export type BibNumberConfig = {
    enabled: boolean;
    mode: 'automatic' | 'dynamic';
    nextNumber: number; 
};

export type JerseyType = 'Enduro' | 'XC' | 'Ruta';
export type JerseySize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export type JerseyConfig = {
    id: string;
    name: string;
    type: JerseyType;
    sizes: JerseySize[];
};

export type CustomQuestionType = 'text' | 'radio' | 'checkbox';

export type CustomQuestion = {
    id: string;
    label: string;
    type: CustomQuestionType;
    options?: string[]; // Para radio y checkbox
    required: boolean;
};

export type Event = {
  id: string;
  ongId: string;
  status: EventStatus;
  name: string;
  eventType: EventType;
  date: string; 
  country: string;
  state: string; 
  modality: string;
  description: string;
  imageUrl?: string;
  googleMapsUrl?: string;
  level?: EventLevel;
  distance?: number;
  costType?: 'Gratuito' | 'Con Costo';
  costTiers?: CostTier[];
  paymentDetails?: string;
  organizerName?: string;
  organizerFollowers?: number;
  hasCategories?: boolean;
  categories?: EventCategory[];
  maxParticipants?: number;
  currentParticipants?: number;
  hasRegistrationDeadline?: boolean;
  registrationDeadline?: string; 
  requiresEmergencyContact?: boolean;
  requiresBike?: boolean; 
  requiresWaiver?: boolean;
  waiverText?: string;
  bibNumberConfig?: BibNumberConfig;
  hasJersey?: boolean;
  jerseyConfigs?: JerseyConfig[];
  hasCustomQuestions?: boolean; // Nuevo flag
  customQuestions?: CustomQuestion[]; 
  sponsors?: string[]; 
  isBlocked?: boolean; 
  pageViews?: number; 
};

export type PaymentStatus = 'pending' | 'paid' | 'not_applicable';

export type MarketingConsent = {
  accepted: boolean;
  timestamp: string; 
  ipAddress: string;
  policyVersion: string; 
  legalText: string;
};

export type EventRegistration = {
    id: string;
    eventId: string;
    userId: string;
    registrationDate: string; 
    status: 'confirmed' | 'cancelled';
    paymentStatus?: PaymentStatus;
    paymentMethod?: 'platform' | 'manual'; 
    feeAmount?: number; 
    netPrice?: number;
    financialSnapshot?: {
        amountPaid: number;      
        platformFee: number;     
        organizerNet: number;    
        isFeeAbsorbed: boolean;  
        calculatedAt: string;    
    };
    checkedIn?: boolean;
    checkedInAt?: string; 
    tierId?: string;
    tierName?: string;
    price?: number;
    categoryId?: string;
    categoryName?: string;
    bikeId?: string;
    bibNumber?: number | null;
    jerseyModel?: string; 
    jerseySize?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    bloodType?: string | null;
    insuranceInfo?: string | null;
    allergies?: string | null; 
    waiverSignature?: string; 
    waiverAcceptedAt?: string; 
    waiverTextSnapshot?: string; 
    waiverIp?: string; 
    waiverHash?: string; 
    marketingConsent?: MarketingConsent | null;
    customAnswers?: Record<string, string | string[]>; // Respuestas a preguntas personalizadas
};

export type EventAttendee = {
    id: string; 
    userId: string;
    name: string;
    lastName: string;
    email: string;
    whatsapp?: string;
    registrationDate: string;
    tierName: string;
    categoryName: string;
    price?: number; 
    status: 'confirmed' | 'cancelled';
    paymentStatus: PaymentStatus;
    paymentMethod?: 'platform' | 'manual';
    feeAmount?: number;
    checkedIn: boolean;
    bibNumber?: number | null;
    jerseyModel?: string; 
    jerseySize?: string;
    bike?: {
        id: string;
        make: string;
        model: string;
        serialNumber: string;
    };
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    bloodType?: string | null;
    insuranceInfo?: string | null;
    allergies?: string | null; 
    waiverSigned?: boolean;
    customAnswers?: Record<string, string | string[]>; // Respuestas personalizadas
};

export type UserEventRegistration = EventRegistration & {
    event: Event;
};

export type Feature = {
  title: string;
  description: string;
  imageUrl?: string;
};

export type SecurityFeature = {
  title: string;
  description: string;
  imageUrl: string;
};

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
      id: 'security';
      title: string;
      subtitle: string;
      items: [SecurityFeature, SecurityFeature, SecurityFeature];
    }
  | {
      id: 'allies';
      title: string;
      sponsors: { name?: string; url: string }[];
    }
  | {
      id: 'cta';
      title: string;
      subtitle: string;
      buttonText?: string;
      imageUrl?: string;
    };

export type ActionFormState = {
  error?: string;
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
  customToken?: string;
  passwordChanged?: boolean;
} | null;

export type BikeFormState = {
    success: boolean;
    message: string;
    errors?: Record<string, string[]>;
} | null;

export type FinancialSettings = {
    commissionRate: number; 
    pasarelaRate: number; 
    pasarelaFixed: number; 
    ivaRate: number; 
};

export type DashboardFilters = {
    country?: string;
    state?: string;
    brand?: string;
    modality?: string;
    gender?: string;
};

export type Payout = {
    id: string;
    eventId: string;
    ongId: string;
    amount: number;
    date: string; 
    proofUrl: string;
    proofPath: string; 
    notes?: string;
    createdBy: string; 
};

export type NotificationTemplate = {
    id: string;
    type: 'theft_alert';
    titleTemplate: string;
    bodyTemplate: string;
    isActive: boolean;
    updatedAt: string;
};

export type NotificationLog = {
    id: string;
    type: 'theft_alert';
    relatedId: string; 
    sentAt: string;
    recipientCount: number;
    successCount: number;
    failureCount: number;
    city: string; 
};

export type LandingEventsHero = {
    title: string;
    subtitle: string;
    ctaButton: string;
    trustCopy: string;
    backgroundImageUrl: string;
};

export type LandingEventsPainPoint = {
    id: string;
    title: string;
    description: string;
    imageUrl?: string; 
};

export type LandingEventsSolution = {
    id: string;
    title: string;
    description: string;
    imageUrl?: string; 
};

export type LandingEventsFeature = {
    title: string;
    description: string;
    imageUrl: string;
};

export type LandingEventsCta = {
    title: string;
    description: string;
    ctaButton: string;
    trustCopy?: string;
};

export type LandingEventsAlly = {
    name: string;
    logoUrl: string;
};

export type LandingEventsContent = {
    hero: LandingEventsHero;
    painPointsSection: {
        title: string;
        points: [LandingEventsPainPoint, LandingEventsPainPoint, LandingEventsPainPoint];
    };
    solutionSection: {
        title: string;
        solutions: [LandingEventsSolution, LandingEventsSolution, LandingEventsSolution];
    };
    featureSection: LandingEventsFeature;
    socialProofSection: {
        allies: LandingEventsAlly[];
    };
    ctaSection: LandingEventsCta;
};

// --- Advertising & Lead Gen System ---

export type CampaignType = 'download' | 'link' | 'coupon';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'ended';
export type CampaignPlacement = 'dashboard_main' | 'dashboard_sidebar' | 'event_list';

export type Campaign = {
    id: string;
    advertiserId: string; // Link to an OngUser (Advertiser)
    
    // Configuration
    title: string; // Public title seen by users
    internalName: string; // For admin management
    type: CampaignType;
    status: CampaignStatus;
    placement: CampaignPlacement;
    
    // Scheduling
    startDate: string; // ISO Date
    endDate: string; // ISO Date
    
    // Assets & Creative
    bannerImageUrl: string; // Main banner
    mobileBannerImageUrl?: string; // Optional mobile optimized
    
    // Action Logic
    assetUrl?: string; // For 'download' type (PDF URL)
    targetUrl?: string; // For 'link' type
    couponCode?: string; // For 'coupon' type
    
    // Analytics (Denormalized for performance)
    clickCount: number;
    uniqueConversionCount: number;
    
    createdAt: string;
    updatedAt: string;
};

export type CampaignConversion = {
    id: string;
    campaignId: string;
    userId: string;
    
    // Snapshot of user data at time of conversion
    userEmail: string;
    userName: string;
    userCity?: string;
    
    convertedAt: string; // ISO Date
    
    ipAddress?: string; // New: Legal
    privacyPolicyVersion?: string; // New: Legal

    metadata?: {
        userAgent?: string;
        deviceType?: string; // 'mobile', 'desktop'
    };
    consent?: {
        accepted: boolean;
        text: string;
        timestamp: string; // ISO
    };
};
