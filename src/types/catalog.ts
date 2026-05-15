export interface CTSInventoryItem {
  id: string;
  supplier_slug: string;
  supplier_raw_ref: string;
  type: 'EXPERIENCE' | 'HOTEL' | 'TRANSFER' | 'FLIGHT';
  title: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
  timezone: string | null;
  category: string | null;
  category_name: string | null;
  duration_minutes: number | null;
  vehicle_class: string | null;
  star_rating: number | null;
  image_urls: string[] | null;
  amenities: string[] | null;
  meal_plans: string[] | null;
  route_origin: string | null;
  route_destination: string | null;
  price_from: number | null;
  price_currency: string | null;
  rating: number | null;
  review_count: number | null;
  raw_content: Record<string, unknown> | null;
  is_active: boolean;
  canonical_id: string | null;
  attraction_id: string | null;
  global_poi_id: string | null;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
  similarity?: number;
}

export interface CatalogBrowseResponse {
  results: CTSInventoryItem[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface CatalogSearchResponse extends CatalogBrowseResponse {
  query_embedding_ms: number;
  search_ms: number;
}

export interface CatalogDetailResponse extends CTSInventoryItem {
  raw_content: Record<string, unknown>;
}

export interface CityFacet {
  city: string;
  count: number;
}

export interface CategoryFacet {
  id: string;
  name: string;
  parent_id: string | null;
  level: number;
  count: number;
}

export interface AvailabilityResponse {
  ok: boolean;
  supplier: string;
  step: 'availability';
  latency_ms: number;
  data: {
    rooms?: {
      code: string;
      name: string;
      rates: {
        rateKey: string;
        net: number;
        currency: string;
        cancellationPolicies: { from: string; amount: string }[];
        boardName: string;
      }[];
    }[];
    slots?: {
      date: string;
      time: string;
      available: boolean;
      tickets: { type: string; price: number; currency: string }[];
    }[];
  };
  error?: string;
}

export interface BookingResponse {
  ok: boolean;
  supplier: string;
  step: 'book';
  latency_ms: number;
  data: {
    bookingRef: string;
    status: 'CONFIRMED' | 'PENDING' | 'FAILED';
    confirmationUrl?: string;
  };
  error?: string;
}

export interface CTSAttractionCluster {
  id: string;
  name: string;
  display_name: string;
  city: string;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  experience_count: number;
  unique_product_count: number | null;
  image_url: string | null;
}

export interface SemanticQueryRequest {
  q: string;
  type?: 'EXPERIENCE' | 'HOTEL' | 'TRANSFER';
  city?: string;
  category?: string;
  supplier?: string;
  limit?: number;
  page?: number;
}

export interface SemanticPlanRequest {
  q: string;
  dates?: { from: string; to: string };
  passengers?: number;
  vibes?: string[];
  budget?: { max: number; currency: string };
}

export interface SemanticPlanResponse {
  itinerary: {
    day: number;
    date: string;
    items: CTSInventoryItem[];
    reasoning: string;
  }[];
  hotel?: CTSInventoryItem;
  meta: {
    query: string;
    model: string;
    latency_ms: number;
    cached: boolean;
  };
}

export interface CTSFlight {
  id: string;
  pnr: string;
  airline: string;
  flightNumber: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  departureTime: string;
  arrivalTime: string;
  status: string;
  aircraft: string;
  terminal: string;
  passengers: number;
  class: string;
}
