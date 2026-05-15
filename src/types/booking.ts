export interface BookingRequest {
  inventoryId: string;
  type: 'HOTEL' | 'EXPERIENCE' | 'TRANSFER';
  supplierSlug: string;
  supplierRawRef: string;
  payload: {
    rateKey?: string;
    checkIn?: string;
    checkOut?: string;
    rooms?: number;
    guests?: { name: string; email: string; phone: string };
    date?: string;
    time?: string;
    tickets?: { type: string; quantity: number }[];
    holder?: { name: string; email: string; phone: string };
  };
  idempotencyKey: string;
}

export interface Booking {
  id: string;
  tripId: string;
  legId: string;
  inventoryId: string;
  type: 'HOTEL' | 'EXPERIENCE' | 'TRANSFER';
  supplierSlug: string;
  bookingRef: string;
  status: 'CONFIRMED' | 'PENDING' | 'FAILED' | 'CANCELLED';
  priceSnapshot: { amount: number; currency: string };
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
}

export interface CheckoutRequest {
  tripId: string;
  services: BookingRequest[];
}

export interface CheckoutResponse {
  checkoutId: string;
  results: {
    inventoryId: string;
    status: 'CONFIRMED' | 'FAILED';
    bookingRef?: string;
    error?: string;
  }[];
  allSucceeded: boolean;
}
