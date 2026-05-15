import type { CTSInventoryItem } from '@/types/catalog';
import type { Hotel, Attraction, Flight, AttractionCategory } from '@/types/services';

const HOTELBEDS_CDN = 'http://photos.hotelbeds.com/giata/bigger/';

const SUPPLIER_NAMES: Record<string, string> = {
  'bridgify': 'Bridgify',
  'viator': 'Viator',
  'hotelbeds-hotels': 'HotelBeds',
  'hotelbeds-activities': 'HotelBeds',
  'hotelbeds-transfers': 'HotelBeds',
  'duffel': 'Duffel',
};

const CATEGORY_MAP: Record<string, AttractionCategory> = {
  'sightseeing-tours': 'Tour',
  'tours': 'Tour',
  'attraction-tickets': 'Attraction',
  'museums': 'Museum',
  'outdoor-activities': 'Outdoor',
  'food-wine': 'Food & Drink',
  'nightlife': 'Nightlife',
  'wellness': 'Wellness',
  'workshops': 'Workshop',
  'shows-concerts': 'Show',
  'water-sports': 'Water Sport',
  'transfers': 'Transfer',
  'city-passes': 'CityPass',
};

export function resolveImageUrl(url: string, supplierSlug: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (supplierSlug === 'hotelbeds-hotels') return HOTELBEDS_CDN + url;
  return url;
}

export function formatDuration(minutes: number | null): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 480) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`;
  }
  return 'Full day';
}

function resolveCategory(raw: string | null): AttractionCategory {
  if (!raw) return 'Tour';
  const lower = raw.toLowerCase().replace(/\s+/g, '-');
  return CATEGORY_MAP[lower] ?? 'Tour';
}

function buildLocation(city: string | null, country: string | null): string {
  if (city && country) return `${city}, ${country}`;
  return city ?? country ?? '';
}

export function ctsToHotel(item: CTSInventoryItem): Hotel {
  const images = (item.image_urls ?? []).map(u => resolveImageUrl(u, item.supplier_slug));
  return {
    id: item.id,
    name: item.title,
    image: images[0] ?? '',
    images,
    rating: item.rating ?? 0,
    price: item.price_from,
    currency: item.price_currency ?? 'USD',
    description: item.description ?? '',
    location: buildLocation(item.city, item.country),
    amenities: item.amenities ?? [],
    reviews: [],
    roomTypes: [],
    starRating: item.star_rating ?? 0,
    supplierId: item.supplier_slug,
    supplierName: SUPPLIER_NAMES[item.supplier_slug] ?? item.supplier_slug,
    poiId: item.global_poi_id ?? undefined,
  };
}

export function ctsToAttraction(item: CTSInventoryItem): Attraction {
  const images = (item.image_urls ?? []).map(u => resolveImageUrl(u, item.supplier_slug));
  return {
    id: item.id,
    name: item.title,
    image: images[0] ?? '',
    images,
    category: resolveCategory(item.category ?? item.category_name),
    price: item.price_from ?? 0,
    currency: item.price_currency ?? 'USD',
    duration: formatDuration(item.duration_minutes),
    durationMinutes: item.duration_minutes ?? 0,
    rating: item.rating ?? 0,
    reviewCount: item.review_count ?? 0,
    location: buildLocation(item.city, item.country),
    description: item.description ?? '',
    highlights: [],
    cancellationPolicy: '',
    reviews: [],
    ticketTypes: [],
    supplierId: item.supplier_slug,
    supplierName: SUPPLIER_NAMES[item.supplier_slug] ?? item.supplier_slug,
    poiId: item.global_poi_id ?? undefined,
  };
}

function parseIsoDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  return (parseInt(match[1] || '0') * 60) + parseInt(match[2] || '0');
}

export function ctsToFlight(item: CTSInventoryItem): Flight {
  const raw = (item.raw_content ?? {}) as Record<string, unknown>;
  const durationMin = item.duration_minutes
    ?? (typeof raw.duration === 'string' ? parseIsoDuration(raw.duration as string) : 0);

  return {
    id: item.id,
    airline: (raw.carrier_name as string) ?? '',
    flightNumber: (raw.flight_number as string) ?? '',
    origin: (raw.origin as string) ?? item.route_origin ?? '',
    originCity: (raw.origin_city as string) ?? item.city ?? '',
    destination: (raw.destination as string) ?? item.route_destination ?? '',
    destinationCity: (raw.destination_city as string) ?? '',
    departureTime: (raw.departing_at as string) ?? '',
    arrivalTime: (raw.arriving_at as string) ?? '',
    status: 'scheduled',
    aircraft: '',
    terminal: '',
    passengers: 1,
    class: mapCabinClass((raw.cabin_class as string) ?? item.category),
    pnr: '',
    durationMinutes: durationMin,
    carrierLogo: (item.image_urls?.[0]) ?? undefined,
    stops: (raw.stops as number) ?? 0,
    fareType: (raw.fare_brand as string) ?? undefined,
  };
}

function mapCabinClass(raw: string | null): Flight['class'] {
  if (!raw) return 'Economy';
  const lower = raw.toLowerCase();
  if (lower.includes('first')) return 'First';
  if (lower.includes('business')) return 'Business';
  if (lower.includes('premium')) return 'Premium Economy';
  return 'Economy';
}
