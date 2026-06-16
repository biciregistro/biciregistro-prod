'use client';

// Matriz de Componentes B2B oficial para Selects y validaciones de la UI.
// Categorías, marcas y sus respectivos modelos principales mapeados rigurosamente.

export type ComponentCategoryKey = 'brakes' | 'fork' | 'shock' | 'tires' | 'drivetrain' | 'motor' | 'saddle' | 'grips' | 'pedals';

export interface CatalogBrandDetails {
  models: string[];
  isSoloFabricante?: boolean;
}

export interface CatalogCategoryDetails {
  label: string;
  brands: Record<string, CatalogBrandDetails>;
}

export const FRAME_MATERIAL_OPTIONS = [
  'Aluminio',
  'Carbono',
  'Acero',
  'Titanio',
  'Bambú',
  'Otro'
] as const;

export const COMPONENT_CATALOG: Record<ComponentCategoryKey, CatalogCategoryDetails> = {
  brakes: {
    label: 'Frenos',
    brands: {
      Shimano: {
        models: ["Genérico", "CUES", "Deore", "SLX", "XT", "XTR", "Saint", "Zee", "Claris", "Sora", "Tiagra", "105", "Ultegra", "Dura-Ace", "GRX"]
      },
      SRAM: {
        models: ["Level", "G2", "Code", "Maven", "DB8", "Apex", "Rival", "Force", "Red"]
      },
      Magura: {
        models: ["MT Sport", "MT2", "MT4", "MT5", "MT7 Pro", "MT8 Pro", "MT eSTOP"]
      },
      Tektro: {
        models: ["Genérico"]
      },
      TRP: {
         models: ["HD-M275", "Aries", "Slate EVO", "Quadiem", "DH-R EVO", "Spyre"]
      },
      Hope: {
        models: ["Tech3 X2", "Tech3 E4", "Tech3 V4", "Tech4 X2", "Tech4 E4", "Tech4 V4"]
      },
      Campagnolo: {
        models: ["Super Record", "Record", "Chorus", "Ekar"]
      },
      Formula: {
        models: ["Cura", "Cura 4"]
      }
    }
  },
  fork: {
    label: 'Suspensión Delantera (Horquilla)',
    brands: {
      RockShox: {
        models: ["Judy", "Recon", "Gold 35", "Silver 35", "SID", "Pike", "Revelation", "Lyrik", "ZEB", "BoXXer", "Rudy"]
      },
      Fox: {
        models: ["32 Rhythm", "32 Performance", "32 Factory", "34 Rhythm", "34 Performance", "34 Factory", "36 Rhythm", "36 Performance", "36 Factory", "38 Rhythm", "38 Performance", "38 Factory", "40 Performance", "40 Factory", "32 Taper-Cast Rhythm", "32 Taper-Cast Performance", "32 Taper-Cast Factory"]
      },
      "SR Suntour": {
        models: ["Genérica", "XCE", "XCT", "XCM", "XCR", "Raidon", "Epixon", "Axon", "Durolux"]
      },
      Marzocchi: {
        models: ["Bomber Z2", "Bomber Z1", "Bomber DJ", "Bomber 58"]
      },
      "Öhlins": {
        models: ["RXF34", "RXF36", "RXF38", "DH38"]
      },
      DVO: {
        models: ["Sapphire", "Diamond", "Onyx"]
      }
    }
  },
  shock: {
    label: 'Amortiguador Trasero',
    brands: {
      Fox: {
        models: ["Float SL", "Float DPS", "Float X", "Float X2", "DHX", "DHX2"]
      },
      RockShox: {
        models: ["SIDLuxe", "Monarch", "Deluxe", "Super Deluxe", "Vivid Air", "Super Deluxe Coil", "Vivid Coil"]
      },
      "SR Suntour": {
        models: ["TriAir", "Edge", "Voro"]
      },
      Marzocchi: {
        models: ["Bomber Air", "Bomber CR (Resorte)"]
      },
      "Öhlins": {
        models: ["TTX1 Air", "TTX2 Air", "TTX22 M (Resorte)"]
      }
    }
  },
  tires: {
    label: 'Llantas (Neumáticos)',
    brands: {
      Maxxis: {
        models: ["Assegai", "Minion (DHF/DHR)", "Ikon", "Rekon", "High Roller", "Rambler"]
      },
      Schwalbe: {
        models: ["Magic Mary", "Nobby Nic", "Pro One", "G-One", "Marathon"]
      },
      Continental: {
        models: ["GP5000", "Gatorskin", "Kryptotal", "Race King", "Terra Speed"]
      },
      Vittoria: {
        models: ["Corsa", "Rubino", "Barzo", "Mezcal", "Mazza", "Terreno"]
      },
      Specialized: {
        models: ["Butcher", "Fast Trak", "S-Works Turbo", "Pathfinder"]
      },
      Pirelli: {
        models: ["P Zero", "Scorpion", "Cinturato"]
      }
    }
  },
  drivetrain: {
    label: 'Transmisión (Grupo)',
    brands: {
      Shimano: {
        models: ["Tourney", "Altus", "Acera", "Alivio", "CUES", "Deore", "SLX", "XT", "XTR", "Claris", "Sora", "Tiagra", "105", "Ultegra", "Dura-Ace", "GRX"]
      },
      SRAM: {
        models: ["SX", "NX", "GX", "X01", "XX1", "Transmission (T-Type)", "Apex", "Rival", "Force", "Red", "XPLR"]
      },
      Campagnolo: {
        models: ["Centaur", "Chorus", "Record", "Super Record", "Ekar"]
      },
      Microshift: {
        models: ["Mezzo", "Acolyte", "Advent", "Advent X", "Sword"]
      }
    }
  },
  motor: {
    label: 'Motores (E-Bike)',
    brands: {
      Shimano: {
        models: ["EP801", "EP6", "EP5", "EP8", "E8000", "E7000"]
      },
      Bosch: {
        models: ["CX-R", "CX (Gen 5)", "SX", "PX", "Cargo Line", "Performance Line"]
      },
      Specialized: {
        models: ["3.1 S-Works", "2.2", "SL 1.2"]
      },
      DJI: {
        models: ["Avinox M2", "Avinox M2S"]
      },
      Brose: {
        models: ["Drive S Mag, Drive S Alu, Drive T, Drive C"]
      },
      Yamaha: {
        models: ["PW-X3", "PW-ST", "PW-CE"]
      },
      Mahle: {
        models: ["X35", "X20"]
      },
      Fazua: {
        models: ["Ride 60", "Ride 50"]
      }
    }
  },
  saddle: {
    label: 'Sillín (Asiento)',
    brands: {
      "Selle Italia": { models: [], isSoloFabricante: true },
      Fizik: { models: [], isSoloFabricante: true },
      "Selle San Marco": { models: [], isSoloFabricante: true },
      Prologo: { models: [], isSoloFabricante: true },
      Specialized: { models: [], isSoloFabricante: true },
      "Bontrager / Trek": { models: [], isSoloFabricante: true },
      WTB: { models: [], isSoloFabricante: true },
      "Brooks England": { models: [], isSoloFabricante: true },
      Ergon: { models: [], isSoloFabricante: true },
      Fabric: { models: [], isSoloFabricante: true },
      "Syncros / Scott": { models: [], isSoloFabricante: true },
      "Selle Royal": { models: [], isSoloFabricante: true }
    }
  },
  grips: {
    label: 'Puños (Grips)',
    brands: {
      ODI: { models: [], isSoloFabricante: true },
      Ergon: { models: [], isSoloFabricante: true },
      "ESI Grips": { models: [], isSoloFabricante: true },
      "Lizard Skins": { models: [], isSoloFabricante: true },
      Renthal: { models: [], isSoloFabricante: true },
      "Vans x ODI": { models: [], isSoloFabricante: true },
      Deity: { models: [], isSoloFabricante: true },
      "Race Face": { models: [], isSoloFabricante: true },
      "PNW Components": { models: [], isSoloFabricante: true },
      Supacaz: { models: [], isSoloFabricante: true }
    }
  },
  pedals: {
    label: 'Pedales',
    brands: {
      Shimano: {
        models: ["SPD (M520, XT, etc.)", "SPD-SL (105, Ultegra)", "Plataforma"]
      },
      Look: {
        models: ["Keo", "X-Track"]
      },
      Crankbrothers: {
        models: ["Eggbeater", "Candy", "Mallet", "Stamp (Plataforma)"]
      },
      Time: {
        models: ["ATAC", "Xpro", "Xpresso"]
      },
      "Speedplay (Wahoo)": {
        models: ["Zero", "Aero", "Nano", "COMP"]
      },
      "Race Face": {
        models: ["Chester", "Atlas (Plataforma)"]
      },
      "OneUp Components": {
        models: ["Comp", "Aluminum (Plataforma)"]
      },
      "DMR Bikes": {
        models: ["Vault", "V12", "V8 (Plataforma)"]
      },
      "HT Components": {
        models: ["T1", "X2", "Serie AE (Plataforma)"]
      },
      "Favero / Garmin": {
        models: ["Assioma (Favero)", "Rally (Garmin)"]
      },
      "Wellgo / VP": {
        models: ["Genéricos (Plataforma y Contacto)"]
      }
    }
  }
};
