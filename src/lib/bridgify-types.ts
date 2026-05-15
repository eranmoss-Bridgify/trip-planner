export interface BridgifyPrice {
  amount: number;
  currency: string;
}

export interface BridgifyLocation {
  lat: number;
  lng: number;
  city: string;
  country: string;
  timezone?: string;
}

export interface BridgifyCancellation {
  free_until?: string;
  penalties?: { hours_before: number; charge_pct: number }[];
}

export interface BridgifyProduct {
  external_id: string;
  uuid: string;
  title: string;
  availability_type?: 'BSN' | 'CLD' | 'TSL' | 'EVT';
  description?: string;
  duration_minutes?: number;
  category?: string;
  price?: number | BridgifyPrice;
  merchant_price?: number;
  location?: BridgifyLocation;
  status?: 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE';
  seats_available?: number;
  main_photo_url?: string;
  photos?: string[];
  supplier?: string;
  free_cancellation?: boolean;
  cancellation?: BridgifyCancellation;
  highlights?: string[];
  inclusions?: string[];
  exclusions?: string[];
  rating?: number;
  review_count?: number;
  additional_info?: {
    external_exclusive_fields?: {
      best_seller?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

export interface BridgifySearchResponse {
  attractions: BridgifyProduct[];
}

export interface BridgifyDetailResponse {
  attraction: BridgifyProduct;
}

export type AvailabilityType = 'BSN' | 'CLD' | 'TSL' | 'EVT';

export interface BridgifyAvailabilitySlot {
  date: string;
  times?: string[];
}

// Shape returned by our normalising proxy route (not the raw Bridgify response)
export interface BridgifyAvailabilityResponse {
  data: {
    type?: AvailabilityType;
    slots: BridgifyAvailabilitySlot[];
  };
}

// Raw shape returned directly by Bridgify production API
export interface BridgifyRawAvailabilityResponse {
  dates?: Record<string, string[]>[];
}
