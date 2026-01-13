
export interface GenerationInsight {
    label: string;
    focus: string;
    keywords: string[];
    description: string;
    interests: string;
    motivations: string;
    digitalPlatforms: string;
    barriers: string;
}

export const GENERATIONS: Record<string, GenerationInsight> = {
    gen_z: {
        label: "Generación Z (15-28 años)",
        focus: "Identidad, Activismo y Adrenalina",
        keywords: ["Urbano", "Fixed Gear", "TikTok", "Activismo"],
        description: "Ven la bicicleta como una herramienta de resistencia urbana y expresión de identidad política/social.",
        interests: "Cultura 'Fixed Gear', estética urbana, personalización DIY y colectivos activistas.",
        motivations: "Apropiación del espacio público, sororidad (en colectivos femeninos) y adrenalina técnica.",
        digitalPlatforms: "TikTok, Instagram Reels, YouTube Shorts y redes descentralizadas.",
        barriers: "Precariedad laboral, infraestructura insegura y hostilidad vial."
    },
    millennials: {
        label: "Millennials (29-44 años)",
        focus: "Experiencia y Conexión Digital",
        keywords: ["Gravel", "Strava", "Zwift", "Salud Mental"],
        description: "Buscan el equilibrio entre la salud mental, la desconexión natural y la validación a través de datos.",
        interests: "Gravel (fuga del asfalto), cicloturismo, eventos que combinan deporte y gastronomía.",
        motivations: "Socialización cuantificada, superación personal (FTP) y bienestar integral.",
        digitalPlatforms: "Strava, Zwift, Instagram y Podcasts.",
        barriers: "Falta de tiempo (balance vida-trabajo) y seguridad en carreteras federales."
    },
    gen_x: {
        label: "Generación X (45-60 años)",
        focus: "Rendimiento y Estatus",
        keywords: ["Gran Fondo", "Superbikes", "Coaching", "Networking"],
        description: "Representan el motor económico del ciclismo amateur. Valoran la competencia técnica y el equipo premium.",
        interests: "Eventos tipo Gran Fondo, entrenamiento estructurado y ciclismo de ruta de alta gama.",
        motivations: "Estatus, salud preventiva contra el estrés y pertenencia a clubes exclusivos.",
        digitalPlatforms: "Facebook (Grupos), WhatsApp y Strava.",
        barriers: "Riesgo de lesiones y falta de respeto al ciclista en vías rápidas."
    },
    boomers: {
        label: "Baby Boomers (60+ años)",
        focus: "Longevidad y Confort",
        keywords: ["E-Bike", "Cicloturismo", "Salud", "Accesibilidad"],
        description: "Lideran la transición hacia la asistencia eléctrica para mantener una vida deportiva activa.",
        interests: "E-Bikes, rutas escénicas con servicios de apoyo y turismo cultural.",
        motivations: "Longevidad activa, socialización presencial y combate al aislamiento.",
        digitalPlatforms: "Facebook, YouTube (tutoriales) y correo electrónico.",
        barriers: "Miedo a caídas (fragilidad física) y complejidad tecnológica excesiva."
    }
};

export function getGenerationId(birthDate: string | Date): keyof typeof GENERATIONS | 'unknown' {
    const date = new Date(birthDate);
    const year = date.getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;

    if (age >= 15 && age <= 28) return 'gen_z';
    if (age >= 29 && age <= 44) return 'millennials';
    if (age >= 45 && age <= 60) return 'gen_x';
    if (age >= 61) return 'boomers';
    
    return 'unknown';
}
