export type BadgeType = 'referral_bronze' | 'referral_silver' | 'referral_gold' | 'referral_ambassador' | 'early_adopter';

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

export type GamificationProfile = {
    currentTier: 'novice' | 'bronze' | 'silver' | 'gold' | 'legend';
    stats: UserStats;
    badges: UserBadge[];
    // Espacio para recompensas futuras
    pointsBalance?: number; 
};
