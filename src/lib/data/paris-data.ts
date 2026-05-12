import { Hotel, Attraction } from '@/lib/mock-data';

export const PARIS_HOTELS: Hotel[] = [
    {
        id: 'ph1',
        name: 'Paris France Hotel',
        rating: 3,
        location: 'Paris',
        image: 'https://images.unsplash.com/photo-1543158266-0066955047b1?auto=format&fit=crop&q=80',
        images: [
            'https://images.unsplash.com/photo-1543158266-0066955047b1?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1590490359683-658d3d23f972?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&q=80',
        ],
        price: 903,
        currency: '₪',
        description: 'Set in a 19th-century building in the literary Marais district, this polished hotel is a 3-minute walk from République metro station and 1 km from the Picasso National Museum. Relax in cozy, soundproofed rooms featuring free Wi-Fi, flat-screen TVs and en suite bathrooms.',
        amenities: ['Free Wi-Fi', 'Air Conditioning', 'Breakfast Available', '24/7 Front Desk', 'Elevator', 'Daily Housekeeping'],
        roomTypes: [
            { id: 'ph1-r1', name: 'Classic Double Room', description: 'Cozy room with a double bed, perfect for couples.', capacity: 2, pricePerNight: 903, currency: '₪', amenities: ['Free Wi-Fi', 'TV', 'En suite bathroom'], image: 'https://images.unsplash.com/photo-1590490359683-658d3d23f972?auto=format&fit=crop&q=80' },
            { id: 'ph1-r2', name: 'Superior Twin Room', description: 'Spacious room with two single beds and street views.', capacity: 2, pricePerNight: 1050, currency: '₪', amenities: ['Free Wi-Fi', 'TV', 'En suite bathroom', 'City View'], image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80' },
            { id: 'ph1-r3', name: 'Family Suite', description: 'Large suite comfortably fitting up to 4 guests.', capacity: 4, pricePerNight: 1450, currency: '₪', amenities: ['Free Wi-Fi', 'TV', 'Bathtub', 'Lounge Area'], image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&q=80' }
        ],
        reviews: [
            { author: 'Sarah J.', rating: 4, text: 'Great location and very clean. The staff was incredibly helpful with restaurant recommendations.', date: 'Oct 12, 2025' },
            { author: 'David T.', rating: 5, text: 'Perfect base for exploring the Marais. Loved the nearby bakeries.', date: 'Sep 28, 2025' }
        ]
    },
    {
        id: 'ph2',
        name: 'At Home Hotel In Montmartre',
        rating: 3,
        location: 'Montmartre',
        image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80',
        images: [
            'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1621293954908-907159247fc8?auto=format&fit=crop&q=80'
        ],
        price: 667,
        currency: '₪',
        description: 'Experience Montmartre like a local. These boutique apartments offer the autonomy of a private flat with the services of a hotel, situated just steps from the Sacré-Cœur basilica and bustling artistic cafes.',
        amenities: ['Kitchenette', 'Free Wi-Fi', 'Smart TV', 'Nespresso Machine'],
        roomTypes: [
            { id: 'ph2-r1', name: 'Studio', description: 'Compact studio with a double bed and kitchenette.', capacity: 2, pricePerNight: 667, currency: '₪', amenities: ['Kitchenette', 'Free Wi-Fi'], image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80' },
            { id: 'ph2-r2', name: 'One-Bedroom Apartment', description: 'Separate bedroom and living area with sofa bed.', capacity: 4, pricePerNight: 950, currency: '₪', amenities: ['Kitchenette', 'Living Area', 'Free Wi-Fi'], image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80' }
        ]
    },
    {
        id: 'ph3',
        name: 'Hotel le Cardinal',
        rating: 4,
        location: 'Paris',
        image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&q=80',
        images: [
            'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80'
        ],
        price: 497,
        currency: '₪',
        description: 'Modern comfort in a classic Parisian setting. Located near the Moulin Rouge, this stylish hotel offers an excellent breakfast buffet and a relaxing outdoor patio.',
        amenities: ['Free Wi-Fi', 'Breakfast Buffet', 'Outdoor Patio', 'Bar'],
        roomTypes: [
            { id: 'ph3-r1', name: 'Standard Room', description: 'Comfortable room overlooking the courtyard.', capacity: 2, pricePerNight: 497, currency: '₪', amenities: ['Free Wi-Fi', 'Air Conditioning'] }
        ]
    },
    {
        id: 'ph4',
        name: 'Hotel Gramont',
        rating: 4,
        location: 'Opéra District',
        image: 'https://images.unsplash.com/photo-1621293954908-907159247fc8?auto=format&fit=crop&q=80',
        images: [
            'https://images.unsplash.com/photo-1621293954908-907159247fc8?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80'
        ],
        price: 829,
        currency: '₪',
        description: 'Boutique elegance near the Opéra. Enjoy sophisticated decor, a personalized welcome, and proximity to major department stores and theaters.',
        amenities: ['Room Service', 'Concierge', 'Free Wi-Fi', 'Air Conditioning'],
        roomTypes: [
            { id: 'ph4-r1', name: 'Executive Room', description: 'Elegant room with premium bedding.', capacity: 2, pricePerNight: 829, currency: '₪', amenities: ['Queen Bed', 'Free Wi-Fi', 'Minibar'] }
        ]
    }
];

export const PARIS_ATTRACTIONS: Attraction[] = [
    {
        id: 'pa1',
        name: 'Paris: 1-Hour Seine Cruise departing from the Eiffel Tower',
        category: 'Tour',
        location: 'Seine River',
        duration: '1 hour',
        rating: 4.4,
        price: 63,
        currency: '₪',
        image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?auto=format&fit=crop&q=80',
        images: [
            'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80'
        ],
        description: 'Discover the beauty of Paris from the heart of the city. Aboard this 1-hour cruise, listen to the audio guide as you drift past the Grand Palais, Louvre, Musée d\'Orsay, and the magnificent Notre Dame.',
        highlights: ['Audio guide in 14 languages', 'Panoramic views of Paris monuments', 'Departures right at the foot of the Eiffel Tower'],
        ticketTypes: [
            { id: 'pa1-t1', name: 'Adult Ticket', description: 'Age 12+', price: 63, currency: '₪', type: 'Adult' },
            { id: 'pa1-t2', name: 'Child Ticket', description: 'Age 4-11', price: 30, currency: '₪', type: 'Child' },
            { id: 'pa1-t3', name: 'Infant Ticket', description: 'Age 0-3', price: 0, currency: '₪', type: 'Infant' }
        ]
    },
    {
        id: 'pa6',
        name: 'Paris: Eiffel Tower 2nd Floor or Summit Access',
        category: 'Attraction',
        location: 'Eiffel Tower',
        duration: '1.5-2 hours',
        rating: 4.7,
        price: 52.3,
        currency: '₪',
        image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1550340499-a6c60fc8287c?auto=format&fit=crop&q=80'],
        description: 'Experience breathtaking views of Paris from the iconic Eiffel Tower.',
        highlights: ['Dedicated entry lines', 'Access to the 1st and 2nd floors by lift', 'Optional Summit access'],
        ticketTypes: []
    },
    {
        id: 'pa3',
        name: 'Disneyland Paris 1-Day Ticket',
        category: 'Attraction',
        location: 'Marne-la-Vallée',
        duration: '1 day',
        rating: 4.6,
        price: 61.4,
        currency: '₪',
        image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80'],
        description: 'Live the magic at Disneyland® Park or Walt Disney Studios® Park.',
        ticketTypes: []
    },
    {
        id: 'pa13',
        name: 'Paris Grevin Wax Museum Ticket',
        category: 'Attraction',
        location: 'Paris',
        duration: '1.5 hours',
        rating: 4.1,
        price: 34.9,
        currency: '₪',
        image: 'https://images.unsplash.com/photo-1514828260103-1e9bf9a58446?auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1514828260103-1e9bf9a58446?auto=format&fit=crop&q=80'],
        description: 'Meet over 200 celebrities at the famous Grevin Wax Museum.',
        ticketTypes: []
    },
    {
        id: 'pa14',
        name: 'Paris: Orsay Museum Entry Ticket',
        category: 'Attraction',
        location: 'Paris',
        duration: '2-3 hours',
        rating: 4.7,
        price: 15.5,
        currency: '₪',
        image: 'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1569683795645-b62e50fbf103?auto=format&fit=crop&q=80'],
        description: 'Discover the largest collection of Impressionist masterpieces.',
        ticketTypes: []
    },
    {
        id: 'pa15',
        name: 'Paris: Arc de Triomphe Rooftop Tickets',
        category: 'Attraction',
        location: 'Paris',
        duration: '1 hour',
        rating: 4.6,
        price: 18.9,
        currency: '₪',
        image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80'],
        description: 'Climb to the top of Paris\'s iconic arch for breathtaking city views.',
        ticketTypes: []
    },
    {
        id: 'pa16',
        name: 'Musee de l\'Orangerie: Entry Ticket',
        category: 'Attraction',
        location: 'Paris',
        duration: '1.5 hours',
        rating: 4.6,
        price: 14.8,
        currency: '₪',
        image: 'https://images.unsplash.com/photo-1522093007474-d86e9bf7ba6f?auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1522093007474-d86e9bf7ba6f?auto=format&fit=crop&q=80'],
        description: 'Admire Claude Monet\'s Water Lilies and other incredible works.',
        ticketTypes: []
    },
    {
        id: 'pa17',
        name: 'Musee Marmottan Monet: Skip The Line Ticket',
        category: 'Attraction',
        location: 'Paris',
        duration: '2 hours',
        rating: 4.6,
        price: 6.5,
        currency: '₪',
        image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80'],
        description: 'See the largest collection of Monet paintings in the world.',
        ticketTypes: []
    },
    {
        id: 'pa18',
        name: 'Paris: Montparnasse Tower Observation Deck',
        category: 'Attraction',
        location: 'Paris',
        duration: '1-2 hours',
        rating: 4.5,
        price: 22.5,
        currency: '₪',
        image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&q=80'],
        description: 'Get the best 360-degree panoramic views of the Eiffel Tower and Paris.',
        ticketTypes: []
    },
    {
        id: 'pa19',
        name: 'Musee national Picasso-Paris: Priority Entry Ticket',
        category: 'Attraction',
        location: 'Paris',
        duration: '2 hours',
        rating: 4.5,
        price: 18.7,
        currency: '₪',
        image: 'https://images.unsplash.com/photo-1554189097-ffe88e998a2b?auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1554189097-ffe88e998a2b?auto=format&fit=crop&q=80'],
        description: 'Immerse yourself in the life and works of Pablo Picasso.',
        ticketTypes: []
    },
    {
        id: 'pa21',
        name: 'Paris: Fondation Louis Vuitton Premium Access',
        category: 'Attraction',
        location: 'Paris',
        duration: '2-3 hours',
        rating: 4.6,
        price: 26.2,
        currency: '₪',
        image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80'],
        description: 'Skip the line to explore contemporary art housed in an architectural marvel by Frank Gehry.',
        ticketTypes: []
    },
    {
        id: 'pa22',
        name: 'Musee Banksy Paris: Exhibition Access',
        category: 'Attraction',
        location: 'Paris',
        duration: '1 hour',
        rating: 4.6,
        price: 14.9,
        currency: '₪',
        image: 'https://images.unsplash.com/photo-1621293954908-907159247fc8?auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1621293954908-907159247fc8?auto=format&fit=crop&q=80'],
        description: 'Immerse yourself in the street art of Banksy.',
        ticketTypes: []
    },
    {
        id: 'pa23',
        name: 'Pantheon: Fast Track Admission Ticket',
        category: 'Attraction',
        location: 'Paris',
        duration: '1 hour',
        rating: 4.7,
        price: 16.1,
        currency: '₪',
        image: 'https://images.unsplash.com/photo-1505322022379-7c3353ee6291?auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1505322022379-7c3353ee6291?auto=format&fit=crop&q=80'],
        description: 'Visit the resting place of France\'s most famous citizens in this monumental neoclassical building.',
        ticketTypes: []
    },
    {
        id: 'pa24',
        name: 'Paris: Aura Invalides Immersive Experience',
        category: 'Attraction',
        location: 'Paris',
        duration: '1 hour',
        rating: 4.7,
        price: 33.4,
        currency: '₪',
        image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80',
        images: ['https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80'],
        description: 'Experience a spectacular light and sound show under the Dôme des Invalides showcasing its history and architecture.',
        ticketTypes: []
    }
];
