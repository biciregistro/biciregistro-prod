
export interface BikeRangeInfo {
    label: string;
    shortLabel: string;
    priceRange: string;
    tier: string;
    tierLabel: string;
    behavior: string;
    features: string;
    brands: string;
    color: string;
    min: number; // Added for type compatibility in analytics
    max: number; // Added
}

export const BIKE_RANGES: Record<string, BikeRangeInfo> = {
    entry: {
        label: "Entrada / Recreativa",
        shortLabel: "Entrada",
        priceRange: "$5,000 - $15,000",
        tier: "Tier 3",
        tierLabel: "Novato / Urbano",
        behavior: "Busca salud o transporte. No compite.",
        features: "Cuadro de aluminio básico o acero. Frenos mecánicos. Suspensión de resorte.",
        brands: "Benotto, Mercurio, Veloci, Alubike (gama baja), Decathlon.",
        color: "#94a3b8", // Slate 400
        min: 0,
        max: 15000
    },
    mid: {
        label: "Media (Entusiasta)",
        shortLabel: "Media",
        priceRange: "$15,000 - $45,000",
        tier: "Tier 2/3",
        tierLabel: "Weekend Warrior",
        behavior: "Empieza a ir a rodadas organizadas. Valora la marca.",
        features: "Aluminio hidroformado. Frenos hidráulicos. Transmisión básica.",
        brands: "Trek Marlin, Specialized Rockhopper, Giant Talon.",
        color: "#22c55e", // Green 500
        min: 15000,
        max: 45000
    },
    mid_high: {
        label: "Media-Alta (Performance)",
        shortLabel: "Media-Alta",
        priceRange: "$45,000 - $95,000",
        tier: "Tier 2",
        tierLabel: "Competitivo Amateur",
        behavior: "Participa en seriales estatales. Entrena con datos (Strava).",
        features: "Entrada al Carbono. Doble suspensión MTB. Transmisiones 12v.",
        brands: "Canyon Grizl, Specialized Chisel, Trek Procaliber.",
        color: "#3b82f6", // Blue 500
        min: 45000,
        max: 95000
    },
    high: {
        label: "Alta (Premium)",
        shortLabel: "Alta",
        priceRange: "$95,000 - $200,000",
        tier: "Tier 1",
        tierLabel: "Pro-Am",
        behavior: "Viaja a competir (GFNY, L'Étape). Busca rendimiento marginal.",
        features: "Carbono avanzado. Electrónicos (AXS/Di2). Kashima.",
        brands: "Specialized Epic, Pivot, Santa Cruz, Cannondale.",
        color: "#8b5cf6", // Violet 500
        min: 95000,
        max: 200000
    },
    superbike: {
        label: "Superbike (Lujo)",
        shortLabel: "Superbike",
        priceRange: "$200,000+",
        tier: "Tier 1",
        tierLabel: "Elite Económica / MAMIL",
        behavior: "Estatus puro. Dueños de empresas, ejecutivos C-Level.",
        features: "Tope de gama. Ediciones limitadas. Componentes cerámicos.",
        brands: "S-Works, Pinarello Dogma, Cervélo R5, Colnago.",
        color: "#eab308", // Yellow 500
        min: 200000,
        max: 9999999
    }
};

export function getBikeRangeId(value: number): keyof typeof BIKE_RANGES | 'unknown' {
    if (!value || value <= 0) return 'unknown';
    
    if (value < 15000) return 'entry';
    if (value < 45000) return 'mid';
    if (value < 95000) return 'mid_high';
    if (value < 200000) return 'high';
    return 'superbike';
}
