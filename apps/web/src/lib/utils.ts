import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PricePeriod, PRICE_PERIOD_SUFFIX } from "@reos/shared";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPriceWithPeriod(
  value: number,
  period?: string | null,
  currency = "EUR",
): string {
  const suffix =
    period && period in PRICE_PERIOD_SUFFIX
      ? PRICE_PERIOD_SUFFIX[period as PricePeriod]
      : "";
  return `${formatCurrency(value, currency)}${suffix}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function relativeTime(value: string | Date): string {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
