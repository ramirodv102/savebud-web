import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Primary currency formatter: $42.500 (no decimals, Argentine locale)
export function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

// Compact version for tight spaces: "$42.5K" above 10k, full otherwise
export function formatARSShort(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 10_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return formatARS(amount);
}

// Section header for history list: "Hoy", "Ayer", or "lun. 12 may."
export function dateLabel(isoDate: string): string {
  const date = parseISO(isoDate);
  if (isToday(date)) return 'Hoy';
  if (isYesterday(date)) return 'Ayer';
  return format(date, "EEE. d MMM.", { locale: es });
}

// Full readable date: "miércoles 15 de mayo de 2024"
export function dateFullLabel(isoDate: string): string {
  return format(parseISO(isoDate), "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
}

// Short date for compact rows: "15 may."
export function dateShortLabel(isoDate: string): string {
  return format(parseISO(isoDate), 'd MMM.', { locale: es });
}

// Current month name, capitalized: "Mayo"
export function currentMonthName(): string {
  const name = format(new Date(), 'MMMM', { locale: es });
  return name.charAt(0).toUpperCase() + name.slice(1);
}
