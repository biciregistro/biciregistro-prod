
import { BadgeType, GamificationProfile, UserBadge, UserStats } from "./gamification-types";

// Nuevos Tipos para soportar reglas dinámicas
export type GamificationRuleId = 
    | 'user_signup'
    | 'referral_signup' 
    | 'bike_registration' 
    | 'event_attendance' 
    | 'bike_recovery' 
    | 'onboarding_complete' 
    | 'ownership_transfer' 
    | 'document_verification'
    | 'link_bikon'
    | 'insurance_purchase'
    | 'download_sticker_pdf'
    | 'download_emergency_qr'
    | 'profile_completion'
    | 'campaign_participation';

export type GamificationRule = {
    id: GamificationRuleId;
    label: string;
    description: string;
    defaultPoints: number; // Valor por defecto si no hay override en DB
};

// Definición de las Acciones Base (Hardcoded defaults, overridden by DB)
export const GAMIFICATION_RULES: Record<GamificationRuleId, GamificationRule> = {
    user_signup: {
        id: 'user_signup',
        label: 'Bienvenida',
        description: 'Puntos por crear tu cuenta en BiciRegistro',
        defaultPoints: 100
    },
    referral_signup: {
        id: 'referral_signup',
        label: 'Invitar Amigo',
        description: 'Puntos otorgados cuando un amigo se registra con tu código',
        defaultPoints: 100
    },
    bike_registration: {
        id: 'bike_registration',
        label: 'Registrar Bicicleta',
        description: 'Puntos por cada bicicleta registrada y validada',
        defaultPoints: 50
    },
    event_attendance: {
        id: 'event_attendance',
        label: 'Asistir a Evento',
        description: 'Puntos por inscribirse a un evento aliado',
        defaultPoints: 30
    },
    bike_recovery: {
        id: 'bike_recovery',
        label: 'Recuperar Bicicleta',
        description: 'Puntos por recuperar una bicicleta robada (éxito comunitario)',
        defaultPoints: 100
    },
    onboarding_complete: {
        id: 'onboarding_complete',
        label: 'Completar Tour',
        description: 'Puntos por terminar el tour inicial de la plataforma',
        defaultPoints: 10
    },
    ownership_transfer: {
        id: 'ownership_transfer',
        label: 'Transferir Propiedad',
        description: 'Puntos por transferir legalmente la propiedad de una bici',
        defaultPoints: 25
    },
    document_verification: {
        id: 'document_verification',
        label: 'Verificar Documentos',
        description: 'Puntos por subir pruebas de propiedad válidas',
        defaultPoints: 40
    },
    link_bikon: {
        id: 'link_bikon',
        label: 'Vincular Bikon',
        description: 'Puntos por activar un dispositivo de rastreo Bikon',
        defaultPoints: 200
    },
    insurance_purchase: {
        id: 'insurance_purchase',
        label: 'Contratar Seguro',
        description: 'Puntos al contratar desde la app y subir tu póliza para validar la protección',
        defaultPoints: 200
    },
    download_sticker_pdf: {
        id: 'download_sticker_pdf',
        label: 'Descargar Etiqueta',
        description: 'Puntos por descargar la etiqueta disuasiva (Primera vez)',
        defaultPoints: 50
    },
    download_emergency_qr: {
        id: 'download_emergency_qr',
        label: 'Descargar QR',
        description: 'Puntos por descargar el QR de emergencia (Primera vez)',
        defaultPoints: 50
    },
    profile_completion: {
        id: 'profile_completion',
        label: 'Completar Perfil',
        description: 'Puntos por llenar información de contacto y emergencia',
        defaultPoints: 20
    },
    campaign_participation: {
        id: 'campaign_participation',
        label: 'Participar en Campaña',
        description: 'Puntos por descargar contenido o registrarse en campañas de aliados',
        defaultPoints: 50
    }
};

// Niveles basados en KILÓMETROS (Puntos)
// Anteriormente: 5, 10, 25, 50 referidos.
// Equivalencia (x100): 500, 1000, 2500, 5000 KM.
export const KM_TIERS = {
    NOVICE: { min: 0, label: 'Iniciado' },
    BRONZE: { min: 500, label: 'Bronce', badgeId: 'referral_bronze' as BadgeType },
    SILVER: { min: 1000, label: 'Plata', badgeId: 'referral_silver' as BadgeType },
    GOLD: { min: 2500, label: 'Oro', badgeId: 'referral_gold' as BadgeType },
    AMBASSADOR: { min: 5000, label: 'Embajador', badgeId: 'referral_ambassador' as BadgeType },
};

export const REFERRAL_COOKIE_NAME = 'biciregistro_ref_code';
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
