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
