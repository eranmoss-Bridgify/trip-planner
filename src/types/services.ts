export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  departureTime: string;
  arrivalTime: string;
  status: 'scheduled' | 'boarding' | 'departed' | 'arrived' | 'cancelled';
  aircraft: string;
  terminal: string;
  passengers: number;
  class: 'Economy' | 'Premium Economy' | 'Business' | 'First';
  pnr: string;
  durationMinutes?: number;
  carrierLogo?: string;
  stops?: number;
  fareType?: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  capacity: number;
  pricePerNight: number;
  currency: string;
  amenities: string[];
  image: string;
  boardName?: string;
  rateKey?: string;
  cancellationPolicies?: { from: string; amount: string }[];
}

export interface Hotel {
  id: string;
  name: string;
  image: string;
  images: string[];
  rating: number;
  price: number | null;
  currency: string;
  description: string;
  location: string;
  amenities: string[];
  reviews: Review[];
  roomTypes: Room[];
  starRating: number;
  date?: string;
  bookingStatus?: BookingStatus;
  supplierId?: string;
  supplierName?: string;
  poiId?: string;
  poiName?: string;
}

export type AttractionCategory =
  | 'Tour' | 'Attraction' | 'Transfer' | 'Event'
  | 'ESim' | 'CityPass' | 'Museum' | 'Outdoor'
  | 'Food & Drink' | 'Nightlife' | 'Wellness'
  | 'Workshop' | 'Show' | 'Water Sport';

export interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  type: 'Adult' | 'Child' | 'Infant' | 'Senior' | 'VIP' | 'Group';
}

export interface Attraction {
  id: string;
  name: string;
  image: string;
  images: string[];
  category: AttractionCategory;
  price: number;
  currency: string;
  duration: string;
  durationMinutes: number;
  rating: number;
  reviewCount: number;
  date?: string;
  location: string;
  description: string;
  highlights: string[];
  cancellationPolicy: string;
  reviews: Review[];
  ticketTypes: TicketType[];
  bookingStatus?: BookingStatus;
  supplierId?: string;
  supplierName?: string;
  poiId?: string;
  poiName?: string;
  alternativesCount?: number;
  isBestSeller?: boolean;
  availabilityUuid?: string;
  availabilityType?: 'BSN' | 'CLD' | 'TSL' | 'EVT';
  lat?: number;
  lng?: number;
}

export interface Review {
  author: string;
  rating: number;
  text: string;
  date: string;
}

export type BookingStatus =
  | 'planned'
  | 'booked'
  | 'booked_manual'
  | 'cancelled'
  | 'pending';

export interface ServiceSelection {
  serviceId: string;
  type: 'Hotel' | 'Attraction';
  date: string;
  time?: string;
  rooms?: { roomId: string; quantity: number }[];
  tickets?: { ticketId: string; quantity: number }[];
  totalPrice: number;
  currency: string;
}

export interface AttractionCluster {
  poiId: string;
  poiName: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  productCount: number;
  canonicalProduct: Attraction;
  supplierCount: number;
  categories: string[];
}

export interface LiveEvent {
  id: string;
  name: string;
  venue: string;
  image: string;
  category: 'Concert' | 'Sports' | 'Theatre' | 'Festival' | 'Comedy';
  date: string;
  time: string;
  priceFrom: number;
  currency: string;
  location: string;
  ticketsAvailable: boolean;
  supplierId?: string;
}
