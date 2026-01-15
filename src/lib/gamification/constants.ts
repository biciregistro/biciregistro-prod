import { BadgeType } from "./gamification-types";

export const REFERRAL_TIERS = {
    NOVICE: { min: 0, label: 'Iniciado' },
    BRONZE: { min: 5, label: 'Bronce', badgeId: 'referral_bronze' as BadgeType },
    SILVER: { min: 10, label: 'Plata', badgeId: 'referral_silver' as BadgeType },
    GOLD: { min: 25, label: 'Oro', badgeId: 'referral_gold' as BadgeType },
    AMBASSADOR: { min: 50, label: 'Embajador', badgeId: 'referral_ambassador' as BadgeType },
};

export const REFERRAL_COOKIE_NAME = 'biciregistro_ref_code';
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
