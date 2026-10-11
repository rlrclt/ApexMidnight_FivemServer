import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert integer satang to formatted Baht string
// e.g. 1500000 satang -> 15,000.00 บาท
export function formatSatangToBaht(satang: number): string {
  if (isNaN(satang)) return "0.00 ฿";
  const baht = satang / 100;
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(baht);
}

// Parse Baht string/float input into integer satang
export function parseBahtToSatang(baht: number | string): number {
  const val = typeof baht === 'string' ? parseFloat(baht.replace(/,/g, '')) : baht;
  if (isNaN(val)) return 0;
  return Math.round(val * 100);
}
