import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

const CURRENCY_KEYWORDS = [
  "revenue",
  "sales",
  "amount",
  "income",
  "profit",
  "expense",
  "cost",
  "price",
  "harga",
  "pendapatan",
  "omzet",
  "total",
  "subtotal",
  "gaji",
  "salary",
  "budget",
  "payment",
  "cash",
  "id_r",
  "idr",
  "rupiah",
];

export function parseNumericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9.-]/g, "");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function formatCurrencyIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumberID(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function isCurrencyFieldName(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase().replace(/\s+/g, "_");
  return CURRENCY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function formatTableValue(value: unknown, fieldName?: string): string {
  const numericValue = parseNumericValue(value);
  if (numericValue === null) return String(value ?? "");

  if (fieldName && isCurrencyFieldName(fieldName)) {
    return formatCurrencyIDR(numericValue);
  }

  return formatNumberID(numericValue);
}
