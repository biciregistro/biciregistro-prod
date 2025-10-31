import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Bike } from "./types";

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
    { value: bike.ownershipDocs && bike.ownershipDocs.length > 0, weight: 1 },
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
