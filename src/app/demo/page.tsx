'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plane, MapPin, Calendar, User, Globe } from 'lucide-react';

// Simulated flight context — what the airline would inject at runtime
const FLIGHT = {
    origin: 'TLV',
    originCity: 'Tel Aviv',
    destination: 'Barcelona',
    destCode: 'BCN',
    flightNumber: 'WV-2026',
    departureDate: '2026-06-15',
    returnDate: '2026-06-20',
    passengers: 2,
    class: 'Economy',
};

function bridgifyUrl() {
    const p = new URLSearchParams({
        destination: FLIGHT.destination,
        date_from: FLIGHT.departureDate,
        date_to: FLIGHT.returnDate,
        passengers: String(FLIGHT.passengers),
        flight: FLIGHT.flightNumber,
        origin: FLIGHT.origin,
        dest_code: FLIGHT.destCode,
    });
    return `/?${p.toString()}`;
}

export default function DemoAirlinePage() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Airline header — owned by the airline, outside the Bridgify frame */}
            <header className="shrink-0 w-full border-b bg-background/95 backdrop-blur z-50">
                <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <Plane className="h-6 w-6 -rotate-45" />
                        <span>Demo Co</span>
                    </div>
                    <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
                        <a href="#" className="hover:text-primary transition-colors">Book a Flight</a>
                        <a href="#" className="hover:text-primary transition-colors">My Trips</a>
                        <a href="#" className="hover:text-primary transition-colors">Check-in</a>
                        <a href="#" className="hover:text-primary transition-colors">Flight Status</a>
                    </nav>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <Globe className="h-5 w-5" />
                        </Button>
                        <Button variant="outline" className="gap-2 rounded-full border-primary/20">
                            <User className="h-4 w-4" />
                            <span className="hidden sm:inline">John Doe</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Flight info bar */}
            <div className="shrink-0 bg-card border-b">
                <div className="container px-4 md:px-6 py-3">
                    <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Plane className="h-4 w-4 text-primary" />
                            <span className="font-medium text-foreground">{FLIGHT.origin} → {FLIGHT.destCode}</span>
                            <span>· Flight {FLIGHT.flightNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{FLIGHT.departureDate} → {FLIGHT.returnDate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{FLIGHT.destination}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{FLIGHT.passengers} passengers · {FLIGHT.class}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bridgify iframe — fills remaining height */}
            <div className="flex-1 flex flex-col min-h-0">
                <iframe
                    src={bridgifyUrl()}
                    className="flex-1 w-full border-0"
                    style={{ minHeight: 'calc(100vh - 112px)' }}
                    title="Bridgify Trip Planner"
                    allow="same-origin"
                />
            </div>
        </div>
    );
}
