/**
 * Catalog types and the offline fallback lists.
 *
 * Postgres is the source of truth for countries, services and gift-card
 * brands (public.number_countries / number_services / gift_card_brands); the
 * db mirror loads them on every refresh. The arrays below are only used when
 * the database cannot be reached, so a screen is never empty.
 *
 * Icons and names are display data. Prices and payout rates always come from
 * the server (quote_number_price / quote_gift_card_payout).
 */
import type { IconName } from '@/components/kit';

export type Country = {
  code: string;
  name: string;
  dial: string;
  flag: string;
  mult: number;
};

export type Service = {
  id: string;
  name: string;
  icon: IconName;
  baseKobo: number;
};

/** Fallback list — Postgres holds the real one. */
export const COUNTRIES: Country[] = [
  { code: 'ng', name: 'Nigeria', dial: '+234', flag: '🇳🇬', mult: 1 },
  { code: 'us', name: 'USA', dial: '+1', flag: '🇺🇸', mult: 1.6 },
  { code: 'gb', name: 'UK', dial: '+44', flag: '🇬🇧', mult: 1.7 },
  { code: 'gh', name: 'Ghana', dial: '+233', flag: '🇬🇭', mult: 0.8 },
  { code: 'ke', name: 'Kenya', dial: '+254', flag: '🇰🇪', mult: 0.85 },
  { code: 'in', name: 'India', dial: '+91', flag: '🇮🇳', mult: 0.6 },
  { code: 'de', name: 'Germany', dial: '+49', flag: '🇩🇪', mult: 1.8 },
  { code: 'ca', name: 'Canada', dial: '+1', flag: '🇨🇦', mult: 1.55 },
];

/** Fallback list — Postgres holds the real one. */
export const SERVICES: Service[] = [
  { id: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp', baseKobo: 80000 },
  { id: 'telegram', name: 'Telegram', icon: 'paper-plane-outline', baseKobo: 50000 },
  { id: 'tiktok', name: 'TikTok', icon: 'musical-notes-outline', baseKobo: 70000 },
  { id: 'instagram', name: 'Instagram', icon: 'logo-instagram', baseKobo: 90000 },
  { id: 'google', name: 'Google', icon: 'logo-google', baseKobo: 60000 },
  { id: 'facebook', name: 'Facebook', icon: 'logo-facebook', baseKobo: 50000 },
  { id: 'x', name: 'X (Twitter)', icon: 'logo-twitter', baseKobo: 40000 },
  { id: 'discord', name: 'Discord', icon: 'logo-discord', baseKobo: 65000 },
  { id: 'tinder', name: 'Tinder', icon: 'flame-outline', baseKobo: 55000 },
  { id: 'uber', name: 'Uber', icon: 'car-outline', baseKobo: 70000 },
  { id: 'snapchat', name: 'Snapchat', icon: 'logo-snapchat', baseKobo: 75000 },
  { id: 'signal', name: 'Signal', icon: 'chatbubble-ellipses-outline', baseKobo: 60000 },
];

/**
 * Fallback price used only when the server quote is unavailable.
 * The server recomputes this exact formula, so the two agree.
 */
export function numberPriceKobo(service: Service, country: Country, markupPct: number): number {
  const raw = service.baseKobo * country.mult * (1 + markupPct / 100);
  return Math.ceil(raw / 100) * 100;
}

export type GiftBrand = {
  id: string;
  name: string;
  icon: IconName;
  /** Naira paid per $1 of face value. */
  rateNgn: number;
};

/** Fallback list — Postgres holds the real one. */
export const GIFT_BRANDS: GiftBrand[] = [
  { id: 'amazon', name: 'Amazon', icon: 'cart-outline', rateNgn: 1500 },
  { id: 'apple', name: 'Apple / iTunes', icon: 'logo-apple', rateNgn: 1550 },
  { id: 'steam', name: 'Steam', icon: 'game-controller-outline', rateNgn: 1600 },
  { id: 'googleplay', name: 'Google Play', icon: 'logo-google', rateNgn: 1450 },
  { id: 'razer', name: 'Razer Gold', icon: 'flash-outline', rateNgn: 1500 },
  { id: 'walmart', name: 'Walmart', icon: 'storefront-outline', rateNgn: 1400 },
  { id: 'sephora', name: 'Sephora', icon: 'sparkles-outline', rateNgn: 1450 },
  { id: 'ebay', name: 'eBay', icon: 'pricetag-outline', rateNgn: 1420 },
];

export const BANKS = [
  'Access Bank',
  'GTBank',
  'Zenith Bank',
  'UBA',
  'First Bank',
  'Kuda',
  'Opay',
  'Moniepoint',
  'Palmpay',
  'Stanbic IBTC',
];

export type Platform = { id: string; name: string; icon: IconName };

export const PLATFORMS: Platform[] = [
  { id: 'instagram', name: 'Instagram', icon: 'logo-instagram' },
  { id: 'tiktok', name: 'TikTok', icon: 'musical-notes-outline' },
  { id: 'x', name: 'X (Twitter)', icon: 'logo-twitter' },
  { id: 'facebook', name: 'Facebook', icon: 'logo-facebook' },
  { id: 'netflix', name: 'Netflix', icon: 'tv-outline' },
  { id: 'spotify', name: 'Spotify', icon: 'musical-note-outline' },
  { id: 'discord', name: 'Discord', icon: 'logo-discord' },
  { id: 'snapchat', name: 'Snapchat', icon: 'logo-snapchat' },
  { id: 'other', name: 'Other', icon: 'apps-outline' },
];

export function platformById(id: string): Platform {
  return PLATFORMS.find((platform) => platform.id === id) ?? PLATFORMS[PLATFORMS.length - 1];
}
