export type Modality = 'Ruta' | 'Montaña' | 'Gravel' | 'Urbana' | 'Plegable' | 'Eléctrica' | 'BMX' | 'Infantil' | 'Otra';

export type BikeStatus = 'safe' | 'stolen' | 'in_transfer' | 'recovered' | 'inventory';

export type BikonDeviceStatus = 'available' | 'assigned' | 'inactive';

export type BikonDevice = {
    id: string; // El UUID (ej. ec6210f2-...)
    shortId: string; // El ID corto (ej. BKN-2F4A)
    status: BikonDeviceStatus;
    qrUrl: string; // URL al QR público (ej. https://biciregistro.mx/e/uuid)
    assignedBikeId?: string; // Si está asignado, a qué bici
    assignedUserId?: string; // Si está asignado, a qué usuario
    assignedAt?: string; // ISO date de cuando se asignó
    createdAt: string;
    batchId?: string; // Para identificar en qué lote se imprimió
};

// Tipo para la UI cuando cruzamos la info del Bikon con la bici
export type BikonDevicePopulated = BikonDevice & {
    bike?: {
        make: string;
        model: string;
        color: string;
    }
};

export interface TheftReport {
    date: string; // ISO Date String
    time?: string;
    country: string;
    state: string;
    city: string;
    zipCode?: string;
    lat?: number;
    lng?: number;
    location: string;
    details: string;
    thiefDetails?: string; 
    contactProfile: string; 
    reward?: string;
}

export interface CustodyEvent {
    type: 'registration' | 'transfer';
    date: string;
    ipAddress: string;
    ownerId: string; // Quién asume o mantiene la propiedad en este evento
    ownerName?: string; // Nombre de quien recibe
    previousOwnerId?: string; // Solo en caso de transferencia
    previousOwnerName?: string; // Nombre de quien transfiere
    saleAmount?: number; // Precio de la transferencia
    location?: string; // Ubicación donde ocurrió la transferencia (o del vendedor)
}

export type Bike = {
    id: string;
    userId: string;
    serialNumber: string;
    make: string;
    model: string;
    color: string;
    modality?: Modality;
    modelYear?: string;
    status: BikeStatus;
    photos: string[];
    ownershipProof?: string; 
    purchaseReceipt?: string;
    features?: string[];
    createdAt: string;
    updatedAt: string;
    registrationIp?: string;
    appraisedValue?: number; // USD o MXN según moneda preferida, usualmente MXN. Calculado via Genkit.
    ownerGender?: string; // Desnormalizado del User actual
    ownerBirthDate?: string; 
    ownerCountry?: string; 
    ownerState?: string; 
    ownerCity?: string; 
    bikonId?: string; // Referencia al ID corto o UUID del Bikon asignado

    theftReport?: TheftReport;
    
    // Recovery Data
    recoveredAt?: string;

    // Trazabilidad y Mercado (B2B / B2C)
    salePrice?: number; // A cuánto se compró originalmente (declarado por usuario)
    
    // Trazabilidad Legal Absoluta
    chainOfCustody?: CustodyEvent[];
    
    // Snapshot del Registro Original (Para no perderlo en transferencias futuras)
    originalOwnerId?: string;
    originalOwnerName?: string;
    originalOwnerLocation?: string;

    // Legacy (Mantenido para compatibilidad)
    transferredAt?: string; 
    transferIp?: string; 
    previousOwnerId?: string; 
    
    adminSharedAt?: string; // Fecha en que un admin compartió la bici robada en redes
};

export type OnboardingStatus = {
    hasRegisteredBike: boolean;
    hasCheckedGamification: boolean;
    hasExploredEvents: boolean;
};

export type UserRole = 'ciclista' | 'admin' | 'ong';

export type NotificationPreferences = {
    emailAlerts: boolean;
    smsAlerts: boolean;
};

export type User = {
    id: string;
    email: string;
    name: string;
    lastName?: string;
    avatarUrl?: string;
    role: UserRole;
    whatsapp?: string; // Optional Contact Number
    
    // Address / Demographic
    country?: string;
    state?: string;
    city?: string;
    zipCode?: string;
    gender?: 'Hombre' | 'Mujer' | 'Prefiero no decirlo';
    birthDate?: string; // YYYY-MM-DD
    
    createdAt: string;
    lastLoginAt?: string;
    notificationPreferences: NotificationPreferences;

    // Relational Counters / Flags for Gamification & UI
    points: number;
    hasStolenBikes?: boolean; 
    ownedBrands?: string[]; // Desnormalizado: ["Trek", "Specialized"]
    ownedModalities?: string[]; // Desnormalizado: ["Ruta", "Montaña"]
    
    fcmTokens?: string[]; // For Push Notifications

    // Referral System
    referralCode?: string; // Unique code to invite others
    referredBy?: string; // UID of the user who invited this user
    
    // Strava Integration
    stravaId?: number;
    stravaAccessToken?: string;
    stravaRefreshToken?: string;
    stravaTokenExpiresAt?: number;
    
    // B2B Integrations
    affiliatedOngId?: string; // Si el ciclista pertenece a una ONG/Club específico
    
    // Premium / Insurance
    hasActiveInsurance?: boolean;
    activeInsuranceProvider?: string;
    
    onboardingCompleted?: boolean;
};

// Strava Activity desnormalizada para leaderboards o validación de seguros
export type B2BStravaActivity = {
    id: string; // Strava Activity ID
    userId: string; // Nuestro UID
    name: string;
    distance: number; // en metros
    movingTime: number; // en segundos
    elapsedTime: number;
    type: string; // 'Ride', 'VirtualRide', 'EBikeRide'
    startDate: string;
    startLatlng: [number, number];
    endLatlng: [number, number];
    mapPolyline?: string;
    averageSpeed?: number;
    maxSpeed?: number;
    elevationGain?: number;
};

export type OngUser = {
    id: string; // Matches User ID
    organizationName: string;
    logoUrl?: string;
    description?: string;
    website?: string;
    country: string;
    state: string;
    city: string;
    contactEmail: string;
    contactWhatsapp: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    verificationDocuments?: string[]; // URLs to legal docs
    createdAt: string;
    subscriptionPlan: 'free' | 'pro' | 'enterprise'; // Monetization
    
    // Configuración Bancaria (Solo lectura por el admin, modificable por el dueño de la ONG)
    financialData?: {
        bankName: string;
        accountHolder: string;
        clabe: string;
        constanciaFiscalUrl?: string;
    }
};

// --- EVENT MANAGEMENT TYPES ---

export type EventStatus = 'draft' | 'published';
export type EventType = 'Rodada' | 'Competencia' | 'Taller' | 'Conferencia';
export type EventLevel = 'Principiante' | 'Intermedio' | 'Avanzado';

export type CostTier = {
    id: string; // UUID temporal para renderizado de React
    name: string; // Ej: "Preventa", "General", "VIP"
    price: number; // Precio final cobrado al usuario (Public Price)
    netPrice: number; // Lo que recibe la ONG (Descontando fee)
    fee: number; // Comisión de BiciRegistro + Pasarela
    capacity: number; // Límite de lugares para esta tarifa (0 = sin límite)
    absorbFee: boolean; // Si la ONG absorbió el fee (para saber cómo calcular 'price')
    endDate?: string; // Opcional: Hasta cuándo es válida esta tarifa
};

export type EventCategory = {
    id: string; // UUID temporal
    name: string; // Ej: "Élite Femenil", "Master 30+", "Recreativa"
    modality: Modality;
    distanceStr: string; // Ej: "40km", "15km", "100 millas"
    routeMapUrl?: string; // Strava route o GPX preview
    hasPrizes?: boolean;
    prizeDescription?: string;
};

export type BibNumberConfig = {
    enabled: boolean;
    mode: 'auto' | 'manual';
    nextNumber: number; // Contador interno si es 'auto'
};

export type JerseyType = 'Enduro' | 'XC' | 'Ruta';
export type JerseySize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export type JerseyConfig = {
    id: string;
    type: JerseyType;
    designUrl?: string;
    sizes: JerseySize[];
};

export type CustomQuestionType = 'text' | 'radio' | 'checkbox';

export type CustomQuestion = {
    id: string; // UUID temporal o field name ('q1', 'q2')
    type: CustomQuestionType;
    label: string;
    required: boolean;
    options?: string[]; // Si es radio o checkbox
};

export type Event = {
    id: string;
    ongId: string;
    status: EventStatus;
    
    // Step 1: Definition
    name: string;
    type: EventType;
    level: EventLevel;
    startDate: string; // ISO Date String
    endDate?: string; // ISO Date String
    locationName: string; // Ej: "Parque Fundidora"
    address: string;
    city: string;
    state: string;
    description: string;
    coverImageUrl?: string;
    routeMapUrl?: string; // Enlace a Strava Route o Komoot
    
    // Step 2: Logistics & Bike Validation
    categories?: EventCategory[];
    requireRegisteredBike: boolean; // CORE B2B: Forzar registro en BiciRegistro
    allowedModalities?: Modality[]; // Si está vacío, permite todas
    jerseyConfig?: JerseyConfig[];
    
    // Step 3: Cost & Registration
    costType: 'Gratuito' | 'De Pago';
    costTiers?: CostTier[]; // Si es de pago
    registrationDeadline?: string;
    maxParticipants?: number; // Global limit
    currentParticipants: number; // Denormalized counter
    
    // Step 4: Configuration & Legal
    bibNumberConfig?: BibNumberConfig;
    customQuestions?: CustomQuestion[];
    waiverText?: string; // Custom waiver or generic platform waiver
    
    // Analytics
    pageViews: number;
    createdAt: string;
    updatedAt: string;
};

// --- REGISTRATION & ATTENDEE TYPES ---

export type PaymentStatus = 'pending' | 'paid' | 'not_applicable';

export type MarketingConsent = {
    smsPromo: boolean;
    emailPromo: boolean;
    shareDataWithOng: boolean;
};

// Lo que se guarda en la colección 'event-registrations'
export type EventRegistration = {
    id: string;
    eventId: string;
    ongId: string;
    userId: string;
    
    // Snapshot of selections
    tierId?: string; // CostTier seleccionado
    categoryId?: string; // EventCategory seleccionada
    bikeId?: string; // Si el evento requería bici, con cuál se registró
    jerseySelection?: { type: string; size: string }; // Si aplica
    
    // Custom Answers Snapshot (Record<questionId, answer>)
    customAnswers?: Record<string, string | string[]>;
    
    // Status
    paymentStatus: PaymentStatus;
    mercadopagoPreferenceId?: string; // Payment Link reference
    mercadopagoPaymentId?: string; // Final confirmed payment
    amountPaid: number; // Snapshot del precio pagado
    
    // Logistics
    bibNumber?: number; // Número de competidor asignado
    isCheckedIn: boolean; // Para el día del evento
    
    // Legal & Security
    waiverAcceptedAt: string; // ISO Date de la firma electrónica
    waiverIpAddress: string; // Traza de seguridad
    emergencyContactName: string;
    emergencyContactPhone: string;
    bloodType: string;
    allergies?: string;
    marketingConsent: MarketingConsent;
    
    createdAt: string;
};

// Tipo para la tabla de asistentes en el Dashboard de la ONG (Join user + registration)
export type EventAttendee = {
    registrationId: string;
    userId: string;
    name: string;
    lastName?: string;
    email: string;
    whatsapp?: string;
    
    categoryName?: string;
    tierName?: string;
    bibNumber?: number;
    paymentStatus: PaymentStatus;
    isCheckedIn: boolean;
    
    bikeMake?: string;
    bikeModel?: string;
    bikeSerial?: string;
    
    emergencyName?: string;
    emergencyPhone?: string;
    bloodType?: string;
    
    // Computed from customAnswers
    tshirtSize?: string; 
    
    registeredAt: string;
};

// Tipo para el historial del usuario (Mi calendario de eventos)
export type UserEventRegistration = EventRegistration & {
    event: Pick<Event, 'name' | 'startDate' | 'locationName' | 'city' | 'coverImageUrl' | 'status'>;
};

export type Feature = {
    title: string;
    description: string;
    icon: string;
};

export type SecurityFeature = {
    title: string;
    description: string;
};

export type HomepageSection = 
  | 'hero'
  | 'stats'
  | 'features'
  | 'security'
  | 'howItWorks'
  | 'allies';

export interface HomepageData {
    hero: {
        title: string;
        subtitle: string;
        ctaPrimary: string;
        ctaSecondary: string;
        backgroundImageUrl: string;
    };
    stats: {
        registeredBikes: number;
        recoveredBikes: number;
        activeUsers: number;
    };
    features: Feature[];
    security: {
        title: string;
        description: string;
        features: SecurityFeature[];
        mainImageUrl: string;
    };
    allies: {
        name: string;
        logoUrl: string;
        websiteUrl?: string;
    }[];
}

export type ActionFormState = {
    success?: boolean;
    error?: string;
    errors?: Record<string, string[]>;
    message?: string;
};

// Extendemos ActionFormState específicamente para el formulario de bicicletas
// para que TypeScript sepa que la promesa devuelve un objeto que encaja con `useActionState`
export type BikeFormState = ActionFormState & {
    // Aquí puedes añadir propiedades específicas si es necesario, 
    // pero por ahora hereda success, error, errors y message.
};

export type FinancialSettings = {
    platformFeePercentage: number; // Ej: 5 (5%)
    platformFeeFixedAmount: number; // Ej: 15 ($15 MXN por transacción B2B2C)
    taxRatePercentage: number; // Ej: 16 (16% IVA)
};

// Tipos para los filtros del dashboard de admin
export type DashboardFilters = {
    brand?: string;
    type?: string;
    state?: string;
    city?: string;
    startDate?: string;
    endDate?: string;
    eventOngId?: string; // NUEVO: Para filtrar métricas por un evento en específico (Admin Overview)
};

export type Payout = {
    id: string;
    ongId: string;
    amount: number; // Monto transferido (Neto para la ONG)
    status: 'pending' | 'processing' | 'paid' | 'failed';
    date: string; // Fecha de creación
    paidAt?: string; // Fecha de transferencia exitosa
    referenceId?: string; // Referencia bancaria / SPEI
    eventIds: string[]; // Qué eventos cubre este corte
    receiptUrl?: string; // Comprobante de pago subido por Admin
};

export type NotificationTemplate = {
    id: string;
    name: string;
    type: 'push' | 'email' | 'in_app';
    titleTemplate: string; // Soporta variables ej: "Hola {{name}}"
    bodyTemplate: string;
    actionUrl?: string; // Deeplink o ruta
};

export type NotificationLog = {
    id: string;
    userId: string;
    templateId: string;
    title: string;
    body: string;
    sentAt: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    error?: string;
};

// --- LANDING EVENTS CONTENT TYPES ---
export type LandingEventsHero = {
    title: string;
    subtitle: string;
    ctaPrimary: string;
    backgroundImageUrl: string;
};

export type LandingEventsPainPoint = {
    title: string;
    description: string;
    icon: string;
};

export type LandingEventsSolution = {
    title: string;
    description: string;
    icon: string;
};

export type LandingEventsFeature = {
    title: string;
    description: string;
    imageUrl?: string;
};

export type LandingEventsCta = {
    title: string;
    subtitle: string;
    buttonText: string;
};

export type LandingEventsAlly = {
    name: string;
    logoUrl: string;
};

export type LandingEventsContent = {
    id: string;
    hero: LandingEventsHero;
    painPointsSectionTitle: string;
    painPoints: LandingEventsPainPoint[];
    solutionSectionTitle: string;
    solutionSectionSubtitle: string;
    solutions: LandingEventsSolution[];
    featuresSectionTitle: string;
    features: LandingEventsFeature[];
    cta: LandingEventsCta;
    alliesSectionTitle: string;
    allies: LandingEventsAlly[];
    updatedAt: string;
};


// --- PROMOTIONAL CAMPAIGNS (B2B2C) ---
export type CampaignType = 'download' | 'link' | 'coupon' | 'reward' | 'giveaway';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'ended';
export type CampaignPlacement = 'dashboard_main' | 'dashboard_sidebar' | 'event_list' | 'welcome_banner';
export type CampaignTargetScope = 'global' | 'state'; // Si es global o segmentada

export type Campaign = {
    id: string;
    ongId: string; // Quién creó la campaña (B2B)
    title: string;
    description: string;
    type: CampaignType;
    status: CampaignStatus;
    
    // Media & Branding
    imageUrl?: string;
    buttonText: string;
    
    // Segmentación
    targetScope: CampaignTargetScope;
    targetStates?: string[]; // Si targetScope es 'state'
    targetGenders?: string[]; // Para segmentación extra (opcional)
    
    // Reglas de Visualización
    placement: CampaignPlacement;
    startDate: string; // ISO Date
    endDate?: string;  // ISO Date (Opcional, puede ser indefinida)
    maxConversions?: number; // Límite total de veces que se puede reclamar/usar
    
    // Acciones Específicas según el Type
    actionUrl?: string; // Para tipo 'link' o 'download'
    couponCode?: string; // Para tipo 'coupon'
    
    // Analíticas Embebidas
    viewsCount: number;
    clicksCount: number;
    conversionsCount: number;
    
    // Metadata
    createdAt: string;
    updatedAt: string;
    
    // (NUEVO) Exclusivo para tipo 'reward'
    rewardBicycleTypes?: string[]; // Modalities permitidas (ej. ["Montaña"])
    rewardGeneration?: string; // Generación objetivo (ej. "Millennial", "Gen Z")
    requiredLevel?: number; // Nivel de gamificación mínimo requerido
    pointCost?: number; // Cuántos puntos cuesta canjearla
};

export type CampaignConversion = {
    id: string;
    campaignId: string;
    userId: string;
    ongId: string; // Para que la ONG pueda descargar su base de leads
    
    // Snapshot del usuario al momento de convertir
    userName: string;
    userEmail: string;
    userState?: string;
    
    convertedAt: string;
};

// --- SEGUROS B2B2C ---
export interface QuotationRequest {
    bikeId: string;
    userId: string;
    estimatedValue: number; // USD o MXN
    modality: string;
    usageType: 'RECREATIONAL' | 'COMMUTING' | 'COMPETITIVE' | 'COMMERCIAL';
    postalCode: string;
    birthDate: string; // Para edad del asegurado
}

export interface InsurancePolicy {
    id: string; // ID interno de BiciRegistro
    bikeId: string;
    userId: string;
    providerId: string; // Ej: 'WAKU', 'SURA', 'QUALITAS'
    providerPolicyNumber?: string; // ID asignado por la aseguradora
    
    status: InsuranceStatus;
    
    // Coberturas
    coverageRoboTotal: boolean;
    coverageResponsabilidadCivil: boolean;
    coverageGastosMedicos: boolean;
    coverageDaniosMateriales: boolean;
    
    // Financiero
    insuredValue: number; // Valor acordado a asegurar
    premiumAmount: number; // Costo de la póliza (Anual)
    deductiblePercentage: number; // Ej: 10%
    
    // Vigencia
    startDate?: string;
    endDate?: string;
    
    // Documentos
    policyDocumentUrl?: string;
    
    // Metadata
    createdAt: string;
    updatedAt: string;
    quotationRequestSnapshot: QuotationRequest;
}

export type InsuranceStatus = 'PENDING' | 'QUOTED' | 'APPROVED' | 'REJECTED' | 'PAYMENT_LINK_SENT' | 'PAID' | 'CLOSED';

export type RewardStatus = 'purchased' | 'redeemed' | 'active';

export type UserReward = {
    id: string;
    userId: string;
    campaignId: string;
    
    // Snapshot de lo que compró
    title: string;
    imageUrl?: string;
    pointCost: number;
    couponCode?: string; // Si aplica
    
    status: RewardStatus;
    
    purchasedAt: string;
    redeemedAt?: string; // Cuando la ONG/Tienda lo escanea
    
    ongId: string; // La ONG que provee la recompensa
};

export type FraudAttemptLog = {
    id?: string;
    userId: string;
    serialNumber: string;
    source: 'local' | 'bike_index';
    ipAddress: string | null;
    attemptedAt: string;
};
