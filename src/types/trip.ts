import type { Hotel, Attraction, BookingStatus, Flight } from './services';

export interface TripDay {
  date: string;
  location: string;
  activities: (Hotel | Attraction)[];
}

export interface BookedHotel {
  hotel: Hotel;
  checkIn: string;
  checkOut: string;
  rooms: { roomId: string; quantity: number }[];
}

export interface TripLeg {
  id: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  hotels: BookedHotel[];
  arrivalTransfer?: Attraction;
  days: TripDay[];
  suggestions: (Hotel | Attraction)[];
}

export interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  role: 'Owner' | 'Editor' | 'Viewer';
  email: string;
}

export interface TripDocument {
  id: string;
  name: string;
  type: 'PDF' | 'Image' | 'Ticket';
  url: string;
  dateAdded: string;
}

export interface Note {
  id: string;
  title?: string;
  content: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  flightId?: string;
  attachedFlights: Flight[];
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  image: string;
  passengers: number;
  vibes: string[];
  collaborators: Collaborator[];
  legs: TripLeg[];
  unscheduled: (Hotel | Attraction)[];
  notes: Note[];
  documents: TripDocument[];
  dismissedRecommendations: string[];
}
