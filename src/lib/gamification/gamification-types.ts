export type BadgeType = 'referral_bronze' | 'referral_silver' | 'referral_gold' | 'referral_ambassador' | 'early_adopter' | 'strava_connected' | 'first_ride_synced';

export type UserBadge = {
    id: BadgeType;
    earnedAt: string; // ISO String
    metadata?: Record<string, any>; // Contexto adicional
};

export type UserStats = {
    referralsCount: number;
    // Espacio para futuros contadores
    eventsAttended?: number;
    eventsOrganized?: number;
    kmTraveled?: number;
    bikesRegistered?: number;
};

export type StravaConnectionData = {
    accessToken: string;
    refreshToken: string;
    expiresAt: number; // Timestamp en segundos
    athleteId: number;
    connectedAt: string; // ISO string
    lastSyncDate: string; // ISO string de la última sincronización manual
    totalKmSynced: number; // Acumulado histórico sincronizado
};

export type GamificationProfile = {
    currentTier: 'novice' | 'bronze' | 'silver' | 'gold' | 'legend';
    stats: UserStats;
    badges: UserBadge[];
    // Nuevas propiedades para Rodada Infinita
    pointsBalance?: number; 
    lifetimePoints?: number;
    // Integración con Strava
    strava?: StravaConnectionData;
};

// Configuración global (Administrador)
export type GamificationSettings = {
    // Configuración general
    pointsPerReferral: number;
    
    // Configuración Strava
    stravaInitialBonusPoints: number; // Puntos por conectar la cuenta
    stravaMaxDailyKmLimit: number; // 0 significa sin límite
    stravaConversionRate: number; // Ej: 1.0 (1km = 1 punto)
    stravaAllowedActivityTypes: string[]; // ['Ride', 'MountainBikeRide', 'GravelRide', 'E-BikeRide']
};
