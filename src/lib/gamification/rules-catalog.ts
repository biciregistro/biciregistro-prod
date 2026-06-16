import { Bike, UserCheck, FileCheck, Share2, MapPin, Award, Smartphone, ShieldCheck, Download, Users, FileText, Settings2, Target } from 'lucide-react';
import { GamificationRuleId } from './constants';

export const RULE_ICONS: Record<GamificationRuleId, any> = {
    user_signup: UserCheck,
    referral_signup: Users,
    bike_registration: Bike,
    event_attendance: MapPin,
    bike_recovery: ShieldCheck,
    onboarding_complete: Award,
    ownership_transfer: Share2, // O un icono de intercambio
    document_verification: FileCheck,
    link_bikon: Smartphone,
    insurance_purchase: ShieldCheck,
    download_sticker_pdf: Download,
    download_emergency_qr: Download,
    profile_completion: FileText,
    campaign_participation: Award,
    event_share: Share2,
    action_component_completion: Settings2, // Icono representativo para componentes
    action_full_profile_100: Target // Icono representativo para alcanzar el 100%
};