/**
 * Data derived from the "Perfiles Generacionales del Ciclismo en México 2024-2025" report.
 * Used as a knowledge base for AI-driven strategic reports.
 */
export const MEXICO_CYCLING_MARKET_REPORT = {
    context: "México 2024-2025: Transición demográfica hacia una población mayoritariamente joven-adulta conectada.",
    economicContext: {
        totalMarketValue2025: "845.0M USD",
        growthProjection2034: "1,263.3M USD (CAGR 4.43%)",
        eBikeMarketValue2025: "338.0M USD",
        urbanCongestionCost: "152 horas/año perdidas en tráfico (CDMX)",
        vehicleOperatingCost: "9,661 MXN/año en horas pico"
    },
    digitalConnectivity: {
        totalUsers: "101.9M (84% penetración)",
        intensityHigh: "Millennials lideran con 54% conectados > 9h/día.",
        socialMediaPenetration: {
            instagram: "81%",
            tiktok: "62%"
        }
    },
    generationProfiles: {
        gen_z: {
            segment: "12-29 años (30% población)",
            motivators: "Sostenibilidad ambiental, salud mental, eficiencia temporal.",
            focus: "Multimodal e identitario. Activismo social (feminismo, justicia vial).",
            channels: "TikTok, Instagram, WhatsApp.",
            interests: "Marcas con propósito, tecnología accesible, durabilidad ética.",
            relational: "Colectivos horizontales, documentación digital visual."
        },
        millennials: {
            segment: "30-44 años (Núcleo productivo)",
            motivators: "Ahorro económico, salud cardiovascular, optimización de productividad.",
            focus: "Utilitario-laboral (Commuting). 63% de viajes son al trabajo.",
            channels: "Email, Banca Digital, Facebook, buscadores.",
            interests: "Intermodalidad, e-bikes como reemplazo del auto, apps de rendimiento.",
            relational: "Bicicletas compartidas (Ecobici), redes profesionales, fitness corporativo."
        },
        gen_x: {
            segment: "45-59 años (Especialización)",
            motivators: "Salud mental, maestría técnica, rejuvenecimiento físico.",
            focus: "Deportivo-recreativo de alta especialización (MTB, Gravel).",
            channels: "Facebook, WhatsApp, Strava.",
            interests: "Calidad de componentes, valor de reventa, tecnología e-MTB.",
            relational: "Solo pero conectado (Strava), comunidades de interés técnico."
        },
        boomers: {
            segment: "60+ años (Longevidad)",
            motivators: "Salud preventiva, autonomía funcional, socialización.",
            focus: "Bienestar, recreación suave, movilidad asistida (E-bikes de cuadro bajo).",
            channels: "WhatsApp (83%), Facebook familiar.",
            interests: "Confort ergonómico, seguridad absoluta, facilidad de uso.",
            relational: "Círculos familiares, rodadas con nietos, grupos de jubilados activos."
        }
    },
    genderGap: {
        participation: "16-19% mujeres (brecha marcada por percepción de inseguridad).",
        barriers: "Acoso y falta de infraestructura con perspectiva de género."
    }
};
