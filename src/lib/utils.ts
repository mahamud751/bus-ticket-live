import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function generatePNR(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateSeatNumber(row: number, col: string): string {
  return `${row}${col}`;
}

export function formatDuration(minutes: number): string {
  if (!minutes || isNaN(minutes)) return "0h 0m";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatDistance(distance: number): string {
  if (!distance || isNaN(distance)) return "0";
  return distance.toFixed(0);
}

export function safeArray<T>(arr: T[] | undefined | null): T[] {
  return arr || [];
}

export function safeMap<T, R>(
  arr: T[] | undefined | null,
  mapFn: (item: T, index: number) => R
): R[] {
  return safeArray(arr).map(mapFn);
}
