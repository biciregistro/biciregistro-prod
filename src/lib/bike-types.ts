// Bike Modalities Configuration

// --- LEGACY LIST ---
// Used by existing Bike Registration Wizard.
export const modalityOptions = [
    "Ruta", // Nueva opción agregada
    "Urbana", 
    "Gravel", 
    "Pista", 
    "XC", 
    "Enduro", 
    "Downhill", 
    "Trail", 
    "E-Bike", 
    "Dirt Jump", 
    "MTB",
    "Infantil"
];

// --- NEW MASTER LIST (Admin Dashboard V2) ---
// Used for filtering and analytics. Grouped for better reporting.
export const BIKE_MODALITIES_OPTIONS = [
  { value: "Ruta", label: "Ruta" },
  { value: "MTB", label: "Montaña (MTB, XC, Enduro)" },
  { value: "Urbana", label: "Urbana / Híbrida" },
  { value: "Gravel", label: "Gravel" },
  { value: "E-Bike", label: "Eléctrica (E-Bike)" },
  { value: "Triatlon", label: "Triatlón / Contrarreloj" },
  { value: "BMX", label: "BMX / Dirt Jump" },
  { value: "Pista", label: "Pista / Velódromo" },
  { value: "Infantil", label: "Infantil" },
  { value: "Otra", label: "Otra" },
];

// --- COMPATIBILITY MAPPING ---
// Maps the NEW categories (keys) to OLD values (values) found in DB.
// Used by Dashboard Filters to find legacy data.
export const MODALITY_MAPPING: Record<string, string[]> = {
    "Ruta": ["Ruta"], // Mapeo agregado
    "MTB": ["MTB", "XC", "Enduro", "Downhill", "Trail", "Dirt Jump"],
    "Urbana": ["Urbana"],
    "Gravel": ["Gravel"],
    "E-Bike": ["E-Bike"],
    "Pista": ["Pista"],
    "BMX": ["Dirt Jump"],
    "Infantil": ["Infantil"],
};
