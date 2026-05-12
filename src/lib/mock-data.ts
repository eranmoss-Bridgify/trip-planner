export type Flight = {
    id: string;
    airline: string;
    flightNumber: string;
    origin: string;
    originCity: string;
    destination: string;
    destinationCity: string;
    departureTime: string; // ISO string
    arrivalTime: string; // ISO string
    status: string;
    aircraft: string;
    terminal: string;
    passengers: number;
    class: string;
    pnr: string;
};

export type Room = {
    id: string;
    name: string;
    description: string;
    capacity: number;
    pricePerNight: number;
    currency: string;
    amenities: string[];
    image?: string;
};

export type Hotel = {
    id: string;
    name: string;
    image: string; // Keep as primary image
    images?: string[]; // New image gallery
    rating: number; // 1-5
    price: number; // Keep as "starting from" price
    currency: string;
    description: string;
    location: string;
    amenities?: string[];
    reviews?: { author: string; rating: number; text: string; date: string }[];
    roomTypes?: Room[];
    date?: string; // Booking/scheduled date for drag-to-wrong-day warning
    bookingStatus?: 'planned' | 'booked' | 'booked_manual';
};

export type TicketType = {
    id: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    type: 'Adult' | 'Child' | 'Infant' | 'Senior' | 'VIP';
};

export type Attraction = {
    id: string;
    name: string;
    image: string; // Maintain primary image
    images?: string[]; // New image gallery
    category: 'Tour' | 'Attraction' | 'Transfer' | 'Event' | 'ESim' | 'CityPass';
    price: number; // "Starting from" price
    currency: string;
    duration?: string;
    rating: number;
    date?: string;
    location?: string;
    description?: string;
    highlights?: string[];
    cancellationPolicy?: string;
    reviews?: { author: string; rating: number; text: string; date: string }[];
    ticketTypes?: TicketType[];
    bookingStatus?: 'planned' | 'booked' | 'booked_manual';
};

// Selection State type for tracking what a user has chosen inside the sidebar
export type ServiceSelection = {
    serviceId: string;
    type: 'Hotel' | 'Attraction';
    date?: string;
    time?: string;
    rooms?: { roomId: string; quantity: number }[];
    tickets?: { ticketId: string; quantity: number }[];
    totalPrice?: number;
};

export type TripDay = {
    date: string;
    location: string;
    activities: (Hotel | Attraction)[];
};

// Enhanced Types

export type TripDocument = {
    id: string;
    name: string;
    type: 'PDF' | 'Image' | 'Ticket';
    url: string;
    dateAdded: string;
};

export type Collaborator = {
    id: string;
    name: string;
    avatar: string;
    role: 'Owner' | 'Editor' | 'Viewer';
    email: string;
};

export type Note = {
    id: string;
    title: string;
    content: string;
    updatedAt: string;
};

export type BookedHotel = {
    hotel: Hotel;
    checkIn: string;
    checkOut: string;
    rooms?: { roomId: string; quantity: number }[];
};

export type TripLegData = {
    id: string;
    title: string;
    location: string;
    startDate: string; // ISO
    endDate: string; // ISO
    hotels: BookedHotel[];
    arrivalTransfer: Attraction | null;
    days: TripDay[];
    suggestions?: (Hotel | Attraction)[];
};

export type Trip = {
    id: string;
    flightId?: string;
    attachedFlights?: string[]; // Array of Flight IDs
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
    image: string;
    passengers: {
        infants: number;
        children: number;
        adults: number;
        elderly: number;
    };
    vibes?: string[];
    collaborators: Collaborator[];
    legs: TripLegData[];
    unscheduled: (Hotel | Attraction)[]; // Idea Board
    notes: Note[];
    documents: TripDocument[];
    dismissedRecommendations?: string[]; // IDs of services dismissed by the user
};

export const CURRENT_USER: Collaborator = {
    id: 'u1',
    name: 'Matan Cohen',
    avatar: 'https://github.com/shadcn.png',
    role: 'Owner',
    email: 'matan@example.com'
};

export const UPCOMING_FLIGHT: Flight = {
    id: 'f1',
    airline: 'LY',
    flightNumber: '323',
    origin: 'TLV',
    originCity: 'Tel Aviv',
    destination: 'CDG',
    destinationCity: 'Paris',
    departureTime: '2026-06-15T09:00:00Z',
    arrivalTime: '2026-06-15T13:00:00Z',
    status: 'Scheduled',
    aircraft: 'Boeing 737-900',
    terminal: '3',
    pnr: 'ELR8T2',
    passengers: 2,
    class: 'Business'
};

import { PARIS_HOTELS, PARIS_ATTRACTIONS } from './data/paris-data';

export const HOTELS: Hotel[] = [
    ...PARIS_HOTELS,
    {
        id: 'h99',
        name: 'The Savoy',
        image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop',
        rating: 5,
        price: 650,
        currency: 'GBP',
        description: 'Iconic luxury hotel on the Strand.',
        location: 'London, UK',
    }
];

export const ATTRACTIONS: Attraction[] = [...PARIS_ATTRACTIONS];

// Initialize data for local storage
export const DEFAULT_DB_STATE = {
    currentUser: CURRENT_USER,
    upcomingFlight: UPCOMING_FLIGHT,
    hotels: HOTELS,
    attractions: PARIS_ATTRACTIONS,
    trips: [
        {
            id: 't1',
            flightId: 'f1',
            attachedFlights: ['f1'],
            name: 'Summer in Paris',
            destination: 'Paris, France',
            startDate: '2026-06-15',
            endDate: '2026-06-22',
            image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2073&auto=format&fit=crop',
            passengers: { infants: 0, children: 0, adults: 2, elderly: 0 },
            collaborators: [
                { id: 'u1', name: 'Matan Cohen', avatar: 'https://github.com/shadcn.png', role: 'Owner', email: 'matan@example.com' },
                { id: 'u2', name: 'Sarah Cohen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', role: 'Editor', email: 'sarah@example.com' }
            ] as Collaborator[],
            legs: [
                {
                    id: 'leg-t1-1',
                    title: 'Paris Stop',
                    location: 'Paris',
                    startDate: '2026-06-15',
                    endDate: '2026-06-22',
                    hotels: [],
                    arrivalTransfer: null,
                    days: [
                        { date: '2026-06-15', location: 'Paris', activities: [] as (Hotel | Attraction)[] },
                        { date: '2026-06-16', location: 'Paris', activities: [] as (Hotel | Attraction)[] },
                        { date: '2026-06-17', location: 'Paris', activities: [] as (Hotel | Attraction)[] }
                    ]
                }
            ],
            unscheduled: [],
            notes: [
                { id: 'n1', title: 'Dinner Reservations', content: 'Le Jules Verne at 20:00 on the 16th.', updatedAt: '2026-02-10' }
            ],
            documents: [
                { id: 'd1', name: 'Hotel Voucher.pdf', type: 'PDF', url: '#', dateAdded: '2026-02-01' },
                { id: 'd2', name: 'Disneyland Tickets', type: 'Ticket', url: '#', dateAdded: '2026-02-05' }
            ] as TripDocument[]
        },
        {
            id: 't2',
            name: 'Euro Trip',
            destination: 'London & Paris',
            startDate: '2026-09-10',
            endDate: '2026-09-17',
            image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=2070&auto=format&fit=crop',
            passengers: { infants: 0, children: 1, adults: 2, elderly: 0 },
            collaborators: [
                { id: 'u1', name: 'Matan Cohen', avatar: 'https://github.com/shadcn.png', role: 'Owner', email: 'matan@example.com' }
            ] as Collaborator[],
            legs: [
                {
                    id: 'leg-t2-1',
                    title: 'UK Leg',
                    location: 'London',
                    startDate: '2026-09-10',
                    endDate: '2026-09-12',
                    hotels: [{
                        checkIn: '2026-09-10',
                        checkOut: '2026-09-12',
                        hotel: {
                            id: 'h4',
                            name: 'The Savoy',
                            image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop',
                            rating: 5,
                            price: 650,
                            currency: 'GBP',
                            description: 'Iconic luxury hotel on the Strand.',
                            location: 'London, UK'
                        }
                    }],
                    arrivalTransfer: null,
                    days: [
                        { date: '2026-09-10', location: 'London', activities: [] as (Hotel | Attraction)[] },
                        {
                            date: '2026-09-11',
                            location: 'London',
                            activities: [] as (Hotel | Attraction)[]
                        },
                        { date: '2026-09-12', location: 'London', activities: [] as (Hotel | Attraction)[] }
                    ]
                },
                {
                    id: 'leg-t2-2',
                    title: 'France Leg',
                    location: 'Paris',
                    startDate: '2026-09-13',
                    endDate: '2026-09-17',
                    hotels: [],
                    arrivalTransfer: null,
                    days: [
                        { date: '2026-09-13', location: 'Paris', activities: [] as (Hotel | Attraction)[] },
                        { date: '2026-09-14', location: 'Paris', activities: [] as (Hotel | Attraction)[] }
                    ]
                }
            ],
            unscheduled: [],
            notes: [
                { id: 'n2', title: 'Eurostar Tickets', content: 'Train 9024 departs St Pancras at 10:31.', updatedAt: '2026-08-01' }
            ],
            documents: [] as TripDocument[]
        }
    ]
};

export const ACTIVE_TRIP_ID = 't1';

// EOF
