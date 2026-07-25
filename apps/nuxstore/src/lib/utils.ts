import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSAR(amount: number): string {
  return `SAR ${amount.toFixed(2)}`;
}

export function calcDiscount(price: number, original: number): number {
  return Math.round((1 - price / original) * 100);
}
