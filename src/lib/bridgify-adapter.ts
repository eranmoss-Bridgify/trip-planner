import type { BridgifyProduct } from './bridgify-types';
import type { Attraction, AttractionCategory } from '@/types/services';

const _coord = (v: unknown): number | undefined => {
  const n = Number(v);
  return isNaN(n) || n === 0 ? undefined : n;
};

const CATEGORY_MAP: Record<string, AttractionCategory> = {
  'culture': 'Museum',
  'sightseeing': 'Tour',
  'tours': 'Tour',
  'food': 'Food & Drink',
  'food & drink': 'Food & Drink',
  'outdoor': 'Outdoor',
  'adventure': 'Outdoor',
  'nightlife': 'Nightlife',
  'wellness': 'Wellness',
  'spa': 'Wellness',
  'workshop': 'Workshop',
  'show': 'Show',
  'concert': 'Show',
  'water': 'Water Sport',
  'water sport': 'Water Sport',
  'transfer': 'Transfer',
  'ticket': 'Attraction',
  'attraction': 'Attraction',
  'city pass': 'CityPass',
  'event': 'Event',
  'esim': 'ESim',
};

function resolveCategory(raw?: string, title?: string): AttractionCategory {
  // Try explicit category field first
  if (raw) {
    const lower = raw.toLowerCase();
    for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
      if (lower.includes(key)) return cat;
    }
  }
  // Bridgify rarely returns a category — infer from title instead
  if (title) {
    const t = title.toLowerCase();
    if (/kayak|snorkel|surf|swim|dive|sailing|boat tour|water sport/.test(t)) return 'Water Sport';
    if (/hik(e|ing)|trek|climb|bike tour|cycling|e-bike|ebike|outdoor/.test(t)) return 'Outdoor';
    if (/cook(ing|ery)|tapas|wine tasting|food tour|tasting|paella|gastro|dinner|lunch/.test(t)) return 'Food & Drink';
    if (/museum|gallery|art tour|picasso|mir[óo]|dali|exhibition/.test(t)) return 'Museum';
    if (/skip.the.line|skip the line|entry ticket|entrance ticket|fast.track|priority access|timed entry/.test(t)) return 'Attraction';
    if (/flamenco|concert|show|performance|theater|theatre/.test(t)) return 'Show';
    if (/spa|massage|wellness|yoga|meditation/.test(t)) return 'Wellness';
    if (/airport transfer|private transfer|taxi|shuttle/.test(t)) return 'Transfer';
    if (/segway|e-scooter/.test(t)) return 'Tour';
  }
  return 'Tour';
}

function formatDuration(minutes?: number): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 480) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`;
  }
  return 'Full day';
}

function buildLocation(loc?: BridgifyProduct['location']): string {
  if (!loc) return '';
  if (loc.city && loc.country) return `${loc.city}, ${loc.country}`;
  return loc.city ?? loc.country ?? '';
}

function resolvePrice(price?: number | { amount: number; currency: string }): { amount: number; currency: string } {
  if (price == null) return { amount: 0, currency: 'USD' };
  if (typeof price === 'number') return { amount: price, currency: 'USD' };
  return { amount: price.amount ?? 0, currency: price.currency ?? 'USD' };
}

export function bridgifyToAttraction(product: BridgifyProduct): Attraction {
  const p = resolvePrice(product.price);
  return {
    id: product.external_id,
    name: product.title,
    image: product.main_photo_url ?? '',
    images: (() => {
      const extra: string[] = (product as any).additional_info?.additional_image_urls ?? [];
      const all = product.main_photo_url ? [product.main_photo_url, ...extra.filter(u => u !== product.main_photo_url)] : extra;
      return all.length ? all : (product.main_photo_url ? [product.main_photo_url] : []);
    })(),
    category: resolveCategory(product.category, product.title),
    price: p.amount,
    currency: p.currency,
    duration: formatDuration(product.duration_minutes),
    durationMinutes: product.duration_minutes ?? 0,
    rating: product.rating ?? 0,
    reviewCount: product.review_count ?? 0,
    location: buildLocation(product.location),
    description: product.description ?? '',
    highlights: product.highlights ?? [],
    cancellationPolicy: product.free_cancellation
      ? 'Free cancellation'
      : product.cancellation?.penalties?.length
        ? `${product.cancellation.penalties[0].charge_pct}% fee within ${product.cancellation.penalties[0].hours_before}h`
        : '',
    reviews: [],
    ticketTypes: [],
    supplierId: product.supplier,
    supplierName: product.supplier
      ? product.supplier.charAt(0).toUpperCase() + product.supplier.slice(1)
      : 'Bridgify',
    isBestSeller: product.additional_info?.external_exclusive_fields?.best_seller ?? false,
    availabilityUuid: product.uuid || product.external_id,
    availabilityType: product.availability_type,
    lat: _coord((product as any).geolocation?.lat ?? product.location?.lat),
    lng: _coord((product as any).geolocation?.lng ?? product.location?.lng),
  };
}
