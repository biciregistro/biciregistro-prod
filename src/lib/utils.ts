import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Bike, FinancialSettings } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateBikeProfileCompleteness(bike: Bike): number {
  const fields = [
    { value: bike.serialNumber, weight: 1 },
    { value: bike.make, weight: 1 },
    { value: bike.model, weight: 1 },
    { value: bike.color, weight: 1 },
    { value: bike.modelYear, weight: 1 },
    { value: bike.modality, weight: 1 },
    { value: bike.photos && bike.photos.length > 0, weight: 1 },
    { value: bike.ownershipProof, weight: 1 },
  ];

  const totalWeight = fields.reduce((sum, field) => sum + field.weight, 0);
  const completedWeight = fields.reduce((sum, field) => {
    if (field.value) {
      return sum + field.weight;
    }
    return sum;
  }, 0);

  if (totalWeight === 0) {
    return 0;
  }

  return Math.round((completedWeight / totalWeight) * 100);
}

export function calculateGrossUp(netAmount: number, settings: FinancialSettings): number {
    if (netAmount <= 0) return 0;

    const t_br = settings.commissionRate / 100; // Tasa Biciregistro
    const t_pas = settings.pasarelaRate / 100; // Tasa Pasarela
    const iva_factor = 1 + (settings.ivaRate / 100); // 1.16
    const f_pas = settings.pasarelaFixed; // Fijo Pasarela

    // Numerador: Neto + (Neto * T_br * IVA) + (F_pas * IVA)
    const numerator = netAmount + (netAmount * t_br * iva_factor) + (f_pas * iva_factor);
    
    // Denominador: 1 - (T_pas * IVA)
    const denominator = 1 - (t_pas * iva_factor);

    if (denominator <= 0) {
        console.error("Error crítico en fórmula Gross-up: Denominador negativo o cero. Revisa las tasas.");
        return 0;
    }

    const exactTotal = numerator / denominator;

    // Redondea el total al siguiente número entero
    return Math.ceil(exactTotal);
}

export function calculateFeeBreakdown(totalAmount: number, netAmount: number) {
    if (netAmount === 0) {
        return {
            feeAmount: 0,
            totalAmount: 0,
            netAmount: 0
        };
    }
    
    // Calculamos el costo de gestión total
    const totalFee = totalAmount - netAmount;
    return {
        feeAmount: Number(totalFee.toFixed(2)),
        totalAmount: Number((totalAmount).toFixed(2)),
        netAmount: Number(netAmount.toFixed(2))
    };
}

/**
 * Calculates the breakdown when the organizer decides to absorb the fee.
 * In this case, the 'totalAmount' is the price seen by the public.
 */
export function calculateAbsorbedFee(totalAmount: number, settings: FinancialSettings) {
    if (totalAmount <= 0) return { feeAmount: 0, netAmount: 0 };

    const t_br = settings.commissionRate / 100;
    const t_pas = settings.pasarelaRate / 100;
    const iva_factor = 1 + (settings.ivaRate / 100);
    const f_pas = settings.pasarelaFixed;

    // Fee BR = Total * T_br * IVA
    const feeBR = totalAmount * t_br * iva_factor;
    // Fee Pasarela = (Total * T_pas * IVA) + (F_pas * IVA)
    const feePas = (totalAmount * t_pas * iva_factor) + (f_pas * iva_factor);

    const totalFee = feeBR + feePas;
    const netAmount = totalAmount - totalFee;

    return {
        feeAmount: Number(totalFee.toFixed(2)),
        netAmount: Number(netAmount.toFixed(2))
    };
}

/**
 * Detects URLs in a text and returns an array of parts (text or URL)
 */
export function parseLinksInText(text: string) {
    if (!text) return [];
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            return {
                type: 'link' as const,
                content: part,
                key: index
            };
        }
        return {
            type: 'text' as const,
            content: part,
            key: index
        };
    });
}

/**
 * Función maestra para normalizar nombres de marcas de bicicletas.
 * Elimina espacios extra y caracteres especiales para crear un ID único de búsqueda.
 */
export const normalizeBrand = (text: string | undefined): string => {
    if (!text) return 'UNKNOWN';
    return text.toLowerCase().trim().replace(/[-\s]+/g, '_').replace(/[^a-z0-9_]/g, '');
};

/**
 * Función quirúrgica para limpiar modelos de bicicletas de basura y devolver un arreglo [idNormalizado, displayModelLimpio]
 * Implementa una taxonomía avanzada del mercado ciclista mexicano y global.
 *
 * MANTIENE (Atributos de valor): axs, slx, carbon, alloy, e+, +, -, .
 * ELIMINA (Basura): Rodadas (29, 27.5, 26), Tallas, Colores, Categorías, Relatos, Años.
 */
export const normalizeBikeModel = (modelRaw: string | undefined, brandRaw?: string): { id: string, display: string } => {
    if (!modelRaw || typeof modelRaw !== 'string') return { id: 'INVALID', display: 'INVALID' };

    // 1. Rechazo inmediato de relatos (cadenas inusualmente largas) o valores nulos
    if (modelRaw.length > 50 && modelRaw.split(' ').length > 8) {
        return { id: 'INVALID', display: 'INVALID' };
    }

    let cleanModel = modelRaw.toLowerCase().trim();

    // 2. Basura Explícita (Rechazo Directo)
    const exactGarbage = [
        'no se', 'no sé', 'desconocido', 'unknown', '???', 'otro', 'otra', 'sin modelo',
        'no matching text found', 'bici', 'bicicleta', 'mtb', 'montaña', 'mountain',
        '29', '27.5', '26', '700', '700c' // Rodadas solas sin modelo
    ];
    if (exactGarbage.includes(cleanModel)) {
        return { id: 'INVALID', display: 'INVALID' };
    }

    // 3. Limpieza de Marca, Submarcas y Tallas con prefijo
    cleanModel = cleanModel.replace(/\bliv\b/g, ' ');
    cleanModel = cleanModel.replace(/\btalla\s+[smlxlxxl]\b/g, ' ');

    if (brandRaw) {
        const brandLower = brandRaw.toLowerCase().trim();
        if (brandLower !== 'otra' && brandLower !== 'otro') {
            const escapedBrand = brandLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            cleanModel = cleanModel.replace(new RegExp(`\\b${escapedBrand}\\b`, 'g'), ' ');
        }
    }

    // 4. Limpieza de Años (1990 al 2029) repetidos en el modelo
    cleanModel = cleanModel.replace(/\b(199[0-9]|20[0-2][0-9])\b/g, ' ');

    // 5. Diccionario Avanzado de "Stop Words"
    const stopWordsToRemove = [
        'r\\s*26', 'r\\s*27\\.5', 'r\\s*29', 'r\\s*700c?', 'two nine',
        '29er', '29', '27\\.5', '26', '700c?',
        'bicicleta', 'electrica', 'montaña', 'mountain', 'montain', 'mtb', 'todo terreno', 'road', 'gravel', 'bmx', 'bike',
        'talla', 'chica', 'mediana', 'grande', 'small', 'medium', 'large', 'xl', 'xxl', 'xs', 's[1-6]', 'ml', 't19', '56',
        'gris', 'metal', 'matte', 'black', 'mirror', 'rd-bk', 'rojo', 'roja', 'azul', 'negro', 'negra', 'verde', 'blanco', 'blanca',
        'es de segunda mano', 'de segunda mano'
    ];

    stopWordsToRemove.forEach(pattern => {
        cleanModel = cleanModel.replace(new RegExp(`\\b${pattern}\\b`, 'g'), ' ');
    });

    // 6. GENERACIÓN DEL DISPLAY MODEL LIMPIO
    // Tomamos el resultado limpio de palabras basura, quitamos los espacios múltiples y capitalizamos.
    let displayModel = cleanModel.replace(/\s+/g, ' ').trim();
    
    // Capitalizar cada palabra para que luzca bien en el UI
    displayModel = displayModel.split(' ').map(word => {
        // Excepciones de capitalización (Componentes técnicos se ven mejor en mayúsculas)
        const upperCaseWords = ['axs', 'slx', 'hpc', 'cf', 'crb', 'xta', 'slr', 'rdo', 'wc'];
        if (upperCaseWords.includes(word)) return word.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');


    // 7. GENERACIÓN DEL ID NORMALIZADO
    // Pasamos todo a minúsculas, juntamos los caracteres permitidos y quitamos espacios
    let idModel = cleanModel.replace(/[^a-z0-9.+-]/g, '');
    idModel = idModel.replace(/^[.-]+|[.-]+$/g, '');

    // Si después de la limpieza agresiva no queda nada útil
    if (!idModel || (idModel.length < 2 && !['m', 'l', 's'].includes(idModel))) {
        return { id: 'INVALID', display: 'INVALID' };
    }

    return { id: idModel, display: displayModel };
};
