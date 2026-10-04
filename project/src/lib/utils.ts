export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function walkTimeMin(km: number): number {
  return Math.max(1, Math.round((km / 5) * 60));
}

export type Currency = 'PKR' | 'INR' | 'USD' | 'EUR' | 'GBP';

interface CurrencyConfig {
  symbol: string;
  code: string;
  locale: string;
  label: string;
}

const CURRENCIES: Record<Currency, CurrencyConfig> = {
  PKR: { symbol: 'Rs', code: 'PKR', locale: 'en-PK', label: 'Pakistani Rupee' },
  INR: { symbol: '₹', code: 'INR', locale: 'en-IN', label: 'Indian Rupee' },
  USD: { symbol: '$', code: 'USD', locale: 'en-US', label: 'US Dollar' },
  EUR: { symbol: '€', code: 'EUR', locale: 'en-IE', label: 'Euro' },
  GBP: { symbol: '£', code: 'GBP', locale: 'en-GB', label: 'British Pound' },
};

let activeCurrency: Currency = 'PKR';

export function setCurrency(c: Currency) {
  activeCurrency = c;
}

export function getCurrency(): Currency {
  return activeCurrency;
}

export function getCurrencyConfig(): CurrencyConfig {
  return CURRENCIES[activeCurrency];
}

export function formatPrice(amount: number): string {
  const cfg = CURRENCIES[activeCurrency];
  const formatted = amount.toLocaleString(cfg.locale, { maximumFractionDigits: 0 });
  return `${cfg.symbol} ${formatted}`;
}

export function formatPriceShort(amount: number): string {
  const cfg = CURRENCIES[activeCurrency];
  if (amount >= 100000) {
    return `${cfg.symbol}${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `${cfg.symbol}${(amount / 1000).toFixed(1)}k`;
  }
  return `${cfg.symbol}${amount}`;
}

export const CURRENCY_OPTIONS = Object.entries(CURRENCIES).map(([code, cfg]) => ({
  code: code as Currency,
  ...cfg,
}));

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}

export function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'expired';
  const hr = Math.floor(diff / 3600000);
  const min = Math.floor((diff % 3600000) / 60000);
  if (hr > 0) return `${hr}h ${min}m left`;
  return `${min}m left`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
